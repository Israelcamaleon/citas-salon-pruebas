import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  await prisma.service.upsert({ where:{id:1}, update:{}, create:{ name:'Corte', durationMin:60, priceMXN:200, isActive:true } })
  await prisma.staff.upsert({ where:{email:'recepcion@example.com'}, update:{}, create:{ name:'Recepcion', role:'Barbero', email:'recepcion@example.com', phone:'5555555555', isActive:true } })
  await prisma.location.upsert({ where:{id:1}, update:{}, create:{ name:'Matriz', address:'Centro CDMX', phone:'5555555555', isActive:true } })
  console.log('Seed OK')
}
main().finally(async()=>{await prisma.$disconnect()})
