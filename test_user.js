const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
async function main() {
  await prisma.user.create({
    data: {
      username: 'test_staff',
      password: 'password123',
      name: 'John Staff',
      role: 'STAFF',
    }
  })
}
main()
