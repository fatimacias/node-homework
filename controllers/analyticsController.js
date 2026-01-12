const prisma = require("../db/prisma");
const { StatusCodes } = require("http-status-codes");
const { searchQuerySchema ,usersWithStatSchema } = require("../validation/analyticSchema");

async function getUserAnalytics(req,res,next) {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
        return res.status(StatusCodes.BAD_REQUEST).json({ message: "The user ID passed is not valid." });
    }

    try {
        const user = await prisma.user.findUnique({where : {id : userId}});
        if (!user) 
        {
            return res.status(StatusCodes.NOT_FOUND).json({
                message: "User not found"});
        } 

        const taskStats = await prisma.task.groupBy({
            by: ['isCompleted'],
            where: { userId },
            _count: {
            id: true
        }});

        const recentTasks = await prisma.task.findMany({
        where: { userId },
        select: {
            id: true,
            title: true, 
            isCompleted: true,
            priority: true,
            createdAt: true,
            userId: true,
            User: {
                select: { name: true }
            }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
        });
    
        const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

        const weeklyProgress = await prisma.task.groupBy({
        by: ['createdAt'],
        where:{
            userId,
            createdAt : {gte: oneWeekAgo}
        },
        _count : {id:true}
        });

        res.status(StatusCodes.OK).json(
        { taskStats,recentTasks,weeklyProgress})
    } catch (err) {
        return next(err); 
    }   
}

async function getUsersWithStats(req,res,next) {
    
    const { error, value } = usersWithStatSchema.validate(req.query, {
        abortEarly: false,
    });

    if (error) {
    return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ message: error.message });
    }


    const {page, limit} = value;
    const skip = (page - 1) * limit;

    try {
        const usersRaw = await prisma.user.findMany({
            include:{
                Task: {
                    where : {isCompleted:false},
                    select: { id: true},
                    take : 5
                },
                _count : {
                    select : {
                        Task : true
                    }   
                }
            },
            skip : skip ,
            take : limit,
            orderBy : {createdAt : 'desc'}
        });

        const users = usersRaw.map(user => ({
            id: user.id,
            name: user.name,
            email: user.email,
            createdAt: user.createdAt,
            _count: user._count,
            Task: user.Task
        }));

        const totalUsers = await prisma.user.count();

        const pagination = {
            limit : limit,
            total : totalUsers,
            pages : Math.ceil(totalUsers/limit),
            hasNext : page * limit < totalUsers,
            hasPrev : page > 1
        };

        res.status(StatusCodes.OK).json({users,pagination});
    } catch (err) {
        return next(err);
    }

}

async function searchTasks(req, res, next) {

    const { error, value } = searchQuerySchema.validate(req.query, {
        abortEarly: false,
    });

    if (error) {
    return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ message: error.message });
    }


    const searchQuery = value.q;
    const limit = value.limit;

    const searchPattern = `%${searchQuery}%`;
    const exactMatch = searchQuery;
    const startsWith = `${searchQuery}%`;

    try
    {
        const searchResults = await prisma.$queryRaw`
        SELECT 
        t.id,
        t.title,
        t.is_completed as "isCompleted",
        t.priority,
        t.created_at as "createdAt",
        t.user_id as "userId",
        u.name as "user_name"
        FROM tasks t
        JOIN users u ON t.user_id = u.id
        WHERE t.title ILIKE ${searchPattern} 
        OR u.name ILIKE ${searchPattern}
        ORDER BY 
        CASE 
            WHEN t.title ILIKE ${exactMatch} THEN 1
            WHEN t.title ILIKE ${startsWith} THEN 2
            WHEN t.title ILIKE ${searchPattern} THEN 3
        ELSE 4
        END,
        t.created_at DESC
        LIMIT ${limit}
        `;

        res.status(StatusCodes.OK).json(
            {
                results : searchResults,
                query: "Prisma",
                count : searchResults.length
            }
        )
    }
    catch(err)
    {
        return next(err);
    }
}

module.exports = {
    getUserAnalytics,
    getUsersWithStats,
    searchTasks
} 
