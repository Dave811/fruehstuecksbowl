import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const fastify = Fastify({
  logger: true,
});

// Register plugins
await fastify.register(cors, {
  origin: true,
});

await fastify.register(jwt, {
  secret: process.env.JWT_SECRET || "your-super-secret-key-change-in-production",
});

// Health check
fastify.get("/health", async () => {
  return { status: "ok", timestamp: new Date().toISOString() };
});

// API Routes placeholder
fastify.get("/api/menu", async () => {
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    include: { ingredients: { where: { isActive: true } } },
  });
  return categories;
});

// Auth routes
fastify.post("/api/auth/student/login", async (request: any) => {
  const { firstName, lastName, className, dob } = request.body;
  
  // TODO: Implement student login with DOB hash
  return { message: "Student login not implemented yet" };
});

fastify.post("/api/auth/admin/login", async (request: any) => {
  const { username, pin } = request.body;
  
  // TODO: Implement admin login with PIN
  return { message: "Admin login not implemented yet" };
});

// Order routes
fastify.get("/api/orders/cycle/:cycleId", async (request: any) => {
  const { cycleId } = request.params;
  
  // TODO: Get orders for a cycle
  return { message: "Order list not implemented yet" };
});

fastify.post("/api/orders", async (request: any) => {
  // TODO: Create order
  return { message: "Create order not implemented yet" };
});

// Start server
const start = async () => {
  try {
    await fastify.listen({ port: 3000, host: "0.0.0.0" });
    console.log("Server running at http://localhost:3000");
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
