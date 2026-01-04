const {PrismaClient} = require("@prisma/client");
var opts = {}
if(process.env.NODE_ENV || process.env.NODE_ENV == "development"){
    opts = {log : ["query"]};
}
const prisma = new PrismaClient(opts);
module.exports = prisma;