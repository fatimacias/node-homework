const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "CTD Tasks API",
      version: "1.0.0",
      description: "API documentation for the CTD Node project",
    },
    servers: [
      {
        url: "/",
        description: "Current server",
      },
    ],
    components: {
      securitySchemes: {
        jwtCookie: {
          type: "apiKey",
          in: "cookie",
          name: "jwt",
          description: "JWT session cookie set by /api/users/logon, /api/users/register, /api/users/googleLogon",
        },
      },
      parameters: {
        CsrfToken: {
          in: "header",
          name: "X-CSRF-TOKEN",
          required: true,
          schema: { type: "string" },
          description: "CSRF token returned by logon/register/googleLogon. Required for POST/PATCH/PUT/DELETE.",
        },
      },
      schemas: {
        ErrorResponse: {
          type: "object",
          properties: {
            message: { type: "string" },
          },
        },
        ValidationErrorResponse: {
          type: "object",
          properties: {
            message: { type: "string", example: "Validation failed" },
            details: { type: "array", items: { type: "object" } },
          },
          required: ["message"],
        },
        UserPublic: {
          type: "object",
          properties: {
            id: { type: "integer", example: 1 },
            name: { type: "string", example: "John Doe" },
            email: { type: "string", example: "john@example.com" },
            roles: { type: "string", example: "user" },
          },
          required: ["id", "name", "email", "roles"],
        },
        WelcomeTask: {
          type: "object",
          properties: {
            id: { type: "integer", example: 1 },
            title: { type: "string", example: "Complete your profile" },
            isCompleted: { type: "boolean", example: false },
            userId: { type: "integer", example: 1 },
            priority: { type: "string", enum: ["low", "medium", "high"], example: "medium" },
          },
          required: ["id", "title", "isCompleted", "userId", "priority"],
        },
        UserRegisterRequest: {
          type: "object",
          properties: {
            email: { type: "string", format: "email", example: "john@example.com" },
            name: { type: "string", minLength: 3, maxLength: 30, example: "John Doe" },
            password: {
              type: "string",
              minLength: 8,
              example: "Pa$$word20",
              description:
                "Must include upper & lower case letters, a number, and a special character.",
            },
            recaptchaToken: { type: "string", example: "recaptcha-token" },
          },
          required: ["email", "name", "password", "recaptchaToken"],
        },
        UserLogonRequest: {
          type: "object",
          properties: {
            email: { type: "string", format: "email", example: "john@example.com" },
            password: { type: "string", example: "Pa$$word20" },
          },
          required: ["email", "password"],
        },
        GoogleLogonRequest: {
          type: "object",
          properties: {
            authorizationCode: { type: "string", example: "4/0AbUR2..." },
          },
          required: ["authorizationCode"],
        },
        AuthResponse: {
          type: "object",
          properties: {
            name: { type: "string", example: "John Doe" },
            email: { type: "string", example: "john@example.com" },
            csrfToken: { type: "string", example: "b3d0d2e4-..." },
          },
          required: ["name", "email", "csrfToken"],
        },
        RegisterResponse: {
          type: "object",
          properties: {
            user: { $ref: "#/components/schemas/UserPublic" },
            welcomeTasks: { type: "array", items: { $ref: "#/components/schemas/WelcomeTask" } },
            transactionStatus: { type: "string", example: "success" },
            csrfToken: { type: "string", example: "b3d0d2e4-..." },
          },
          required: ["user", "welcomeTasks", "transactionStatus", "csrfToken"],
        },
        UserShowTask: {
          type: "object",
          properties: {
            id: { type: "integer", example: 10 },
            title: { type: "string", example: "Buy groceries" },
            priority: { type: "string", enum: ["low", "medium", "high"], example: "medium" },
            createdAt: { type: "string", format: "date-time" },
          },
          required: ["id", "title", "priority", "createdAt"],
        },
        UserShowResponse: {
          type: "object",
          properties: {
            id: { type: "integer", example: 1 },
            name: { type: "string", example: "John Doe" },
            email: { type: "string", example: "john@example.com" },
            createdAt: { type: "string", format: "date-time" },
            Task: { type: "array", items: { $ref: "#/components/schemas/UserShowTask" } },
          },
          required: ["id", "name", "email", "createdAt", "Task"],
        },
        AnalyticsTaskStat: {
          type: "object",
          properties: {
            isCompleted: { type: "boolean", example: false },
            _count: {
              type: "object",
              properties: {
                id: { type: "integer", example: 5 },
              },
              required: ["id"],
            },
          },
          required: ["isCompleted", "_count"],
        },
        AnalyticsRecentTask: {
          type: "object",
          properties: {
            id: { type: "integer", example: 1 },
            title: { type: "string", example: "Buy groceries" },
            isCompleted: { type: "boolean", example: false },
            priority: { type: "string", enum: ["low", "medium", "high"], example: "medium" },
            createdAt: { type: "string", format: "date-time" },
            userId: { type: "integer", example: 1 },
            User: {
              type: "object",
              properties: {
                name: { type: "string", example: "John Doe" },
              },
              required: ["name"],
            },
          },
          required: ["id", "title", "isCompleted", "priority", "createdAt", "userId", "User"],
        },
        AnalyticsWeeklyProgressItem: {
          type: "object",
          properties: {
            createdAt: { type: "string", format: "date-time" },
            _count: {
              type: "object",
              properties: {
                id: { type: "integer", example: 2 },
              },
              required: ["id"],
            },
          },
          required: ["createdAt", "_count"],
        },
        AnalyticsUserResponse: {
          type: "object",
          properties: {
            taskStats: { type: "array", items: { $ref: "#/components/schemas/AnalyticsTaskStat" } },
            recentTasks: { type: "array", items: { $ref: "#/components/schemas/AnalyticsRecentTask" } },
            weeklyProgress: {
              type: "array",
              items: { $ref: "#/components/schemas/AnalyticsWeeklyProgressItem" },
            },
          },
          required: ["taskStats", "recentTasks", "weeklyProgress"],
        },
        AnalyticsUserWithStats: {
          type: "object",
          properties: {
            id: { type: "integer", example: 1 },
            name: { type: "string", example: "John Doe" },
            email: { type: "string", example: "john@example.com" },
            createdAt: { type: "string", format: "date-time" },
            _count: {
              type: "object",
              properties: {
                Task: { type: "integer", example: 12 },
              },
              required: ["Task"],
            },
            Task: {
              type: "array",
              description: "Up to 5 incomplete task ids",
              items: {
                type: "object",
                properties: {
                  id: { type: "integer", example: 10 },
                },
                required: ["id"],
              },
            },
          },
          required: ["id", "name", "email", "createdAt", "_count", "Task"],
        },
        AnalyticsUsersWithStatsResponse: {
          type: "object",
          properties: {
            users: { type: "array", items: { $ref: "#/components/schemas/AnalyticsUserWithStats" } },
            pagination: {
              type: "object",
              properties: {
                limit: { type: "integer", example: 10 },
                total: { type: "integer", example: 50 },
                pages: { type: "integer", example: 5 },
                hasNext: { type: "boolean", example: true },
                hasPrev: { type: "boolean", example: false },
              },
              required: ["limit", "total", "pages", "hasNext", "hasPrev"],
            },
          },
          required: ["users", "pagination"],
        },
        AnalyticsTaskSearchResult: {
          type: "object",
          properties: {
            id: { type: "integer", example: 1 },
            title: { type: "string", example: "Buy groceries" },
            isCompleted: { type: "boolean", example: false },
            priority: { type: "string", enum: ["low", "medium", "high"], example: "medium" },
            createdAt: { type: "string", format: "date-time" },
            userId: { type: "integer", example: 1 },
            user_name: { type: "string", example: "John Doe" },
          },
          required: ["id", "title", "isCompleted", "priority", "createdAt", "userId", "user_name"],
        },
        AnalyticsTaskSearchResponse: {
          type: "object",
          properties: {
            results: { type: "array", items: { $ref: "#/components/schemas/AnalyticsTaskSearchResult" } },
            query: { type: "string", example: "Prisma" },
            count: { type: "integer", example: 3 },
          },
          required: ["results", "query", "count"],
        },
        Task: {
          type: "object",
          properties: {
            id: { type: "integer", example: 123 },
            title: { type: "string", example: "Buy groceries" },
            isCompleted: { type: "boolean", example: false },
            priority: { type: "string", enum: ["low", "medium", "high"], example: "medium" },
            createdAt: { type: "string", format: "date-time" },
          },
          required: ["id", "title", "isCompleted", "priority", "createdAt"],
        },
        TaskWithUser: {
          allOf: [
            { $ref: "#/components/schemas/Task" },
            {
              type: "object",
              properties: {
                User: {
                  type: "object",
                  properties: {
                    name: { type: "string", example: "John Doe" },
                    email: { type: "string", example: "john@example.com" },
                  },
                  required: ["name", "email"],
                },
              },
              required: ["User"],
            },
          ],
        },
        Pagination: {
          type: "object",
          properties: {
            page: { type: "integer", example: 1 },
            limit: { type: "integer", example: 10 },
            total: { type: "integer", example: 42 },
            pages: { type: "integer", example: 5 },
            hasNext: { type: "boolean", example: true },
            hasPrev: { type: "boolean", example: false },
          },
          required: ["page", "limit", "total", "pages", "hasNext", "hasPrev"],
        },
        TasksIndexResponse: {
          type: "object",
          properties: {
            tasks: {
              type: "array",
              items: { $ref: "#/components/schemas/TaskWithUser" },
            },
            pagination: { $ref: "#/components/schemas/Pagination" },
          },
          required: ["tasks", "pagination"],
        },
        TaskCreateRequest: {
          type: "object",
          properties: {
            title: { type: "string", minLength: 3, maxLength: 30, example: "Buy groceries" },
            isCompleted: { type: "boolean", example: false },
            priority: { type: "string", enum: ["low", "medium", "high"], example: "medium" },
          },
          required: ["title"],
        },
        TaskPatchRequest: {
          type: "object",
          properties: {
            title: { type: "string", minLength: 3, maxLength: 30, example: "Buy groceries" },
            isCompleted: { type: "boolean", example: true },
            priority: { type: "string", enum: ["low", "medium", "high"], example: "high" },
          },
          minProperties: 1,
        },
        TaskBulkCreateRequest: {
          type: "object",
          properties: {
            tasks: {
              type: "array",
              minItems: 1,
              items: { $ref: "#/components/schemas/TaskCreateRequest" },
            },
          },
          required: ["tasks"],
        },
        TaskBulkCreateResponse: {
          type: "object",
          properties: {
            message: { type: "string", example: "success!" },
            tasksCreated: { type: "integer", example: 3 },
            totalRequested: { type: "integer", example: 3 },
          },
          required: ["message", "tasksCreated", "totalRequested"],
        },
      },
    },
  },
  apis: ["./routers/*.js"],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
