import swaggerJsdoc from "swagger-jsdoc";
import path from "path";

const isCompiled = __filename.endsWith(".js");
const routesGlob = path.join(__dirname, "..", "modules", "**", isCompiled ? "*.routes.js" : "*.routes.ts");

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "KarmaCircle API",
      version: "1.0.0",
      description: "API documentation for the KarmaCircle backend.",
    },
    components: {
      securitySchemes: {
        cookieAuth: {
          type: "apiKey",
          in: "cookie",
          name: "Token",
        },
      },
    },
  },
  apis: [routesGlob],
};

export const swaggerSpec = swaggerJsdoc(options);
