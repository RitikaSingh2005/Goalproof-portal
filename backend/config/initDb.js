import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import prisma from '../prisma/client.js';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendDir = path.resolve(__dirname, '..');
const schemaPath = path.resolve(backendDir, 'prisma/schema.prisma');

/**
 * Ensures SQLite tables exist and default seed data is present on cloud deployments.
 */
export async function initializeDatabase() {
  try {
    if (process.env.NODE_ENV !== 'test') {
      try {
        console.log('[DB Init] Syncing database schema with Prisma...');
        execSync(`npx prisma db push --schema="${schemaPath}" --skip-generate --accept-data-loss`, {
          cwd: backendDir,
          stdio: 'inherit',
          timeout: 45000,
          env: { ...process.env }
        });
        console.log('[DB Init] Database schema synced successfully.');
      } catch (err) {
        console.warn('[DB Init] Schema sync notice:', err.message);
      }

      // Check if users exist; if not, seed initial baseline accounts and an active cycle
      const userCount = await prisma.user.count().catch(() => 0);
      if (userCount === 0) {
        console.log('[DB Init] Empty database detected. Seeding baseline accounts...');
        const passwordHash = await bcrypt.hash('password123', 10);

        const admin = await prisma.user.create({
          data: {
            name: 'Admin User',
            email: 'admin@goalproof.com',
            password: passwordHash,
            role: 'admin',
            department: 'IT',
          }
        });

        const manager = await prisma.user.create({
          data: {
            name: 'Manager User',
            email: 'manager@goalproof.com',
            password: passwordHash,
            role: 'manager',
            department: 'Engineering',
          }
        });

        const employee = await prisma.user.create({
          data: {
            name: 'Employee User',
            email: 'employee@goalproof.com',
            password: passwordHash,
            role: 'employee',
            department: 'Engineering',
            manager_id: manager.id,
          }
        });

        const now = new Date();
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        const endOfYear = new Date(now.getFullYear(), 11, 31);

        const cycle = await prisma.cycle.create({
          data: {
            name: `FY ${now.getFullYear()} Annual Cycle`,
            start_date: startOfYear,
            end_date: endOfYear,
            status: 'active'
          }
        });

        // Demo Goals for Employee
        await prisma.goal.createMany({
          data: [
            {
              user_id: employee.id,
              thrust_area: 'Sales',
              title: 'Increase Q3 Enterprise Sales',
              description: 'Drive high-value enterprise sales pipelines',
              uom_type: 'Percentage',
              target_value: 20,
              weightage: 50,
              status: 'approved',
              smart_score: 88,
              cycle_id: cycle.id
            },
            {
              user_id: employee.id,
              thrust_area: 'Engineering',
              title: 'Improve Core System Performance',
              description: 'Reduce API response latency under 200ms',
              uom_type: 'Numeric',
              target_value: 200,
              weightage: 50,
              status: 'approved',
              smart_score: 92,
              cycle_id: cycle.id
            }
          ]
        });

        console.log('[DB Init] Baseline data successfully seeded.');
      }
    }
  } catch (error) {
    console.error('[DB Init] Database initialization error:', error.message);
  }
}
