export const clearDatabase = async (prisma) => {
  await prisma.achievement.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.goal.deleteMany();
  await prisma.cycle.deleteMany();
  await prisma.user.deleteMany();
};
