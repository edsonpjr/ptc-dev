import { PrismaClient, Luminosidade } from "@prisma/client";

const prisma = new PrismaClient();

const plantas = [
  { nome: "Costela-de-adão", especie: "Monstera deliciosa", preco: 8990, estoque: 12, luminosidade: Luminosidade.MEIA_SOMBRA, petFriendly: false, regaACadaDias: 3 },
  { nome: "Samambaia", especie: "Nephrolepis exaltata", preco: 4500, estoque: 0, luminosidade: Luminosidade.SOMBRA, petFriendly: true, regaACadaDias: 2 },
  { nome: "Suculenta Echeveria", especie: "Echeveria elegans", preco: 2500, estoque: 30, luminosidade: Luminosidade.SOL_PLENO, petFriendly: true, regaACadaDias: 14 },
  { nome: "Jiboia", especie: "Epipremnum aureum", preco: 3990, estoque: 20, luminosidade: Luminosidade.MEIA_SOMBRA, petFriendly: false, regaACadaDias: 5 },
  { nome: "Zamioculca", especie: "Zamioculcas zamiifolia", preco: 7490, estoque: 8, luminosidade: Luminosidade.SOMBRA, petFriendly: false, regaACadaDias: 10 },
  { nome: "Palmeira-areca", especie: "Dypsis lutescens", preco: 15900, estoque: 5, luminosidade: Luminosidade.MEIA_SOMBRA, petFriendly: true, regaACadaDias: 4 },
  { nome: "Cacto-rabo-de-macaco", especie: "Cleistocactus colademonis", preco: 5990, estoque: 0, luminosidade: Luminosidade.SOL_PLENO, petFriendly: true, regaACadaDias: 15 },
];

async function main() {
  await prisma.planta.deleteMany();

  const resultado = await prisma.planta.createMany({ data: plantas });
  console.log(`🌱 Seed concluído: ${resultado.count} plantas criadas.`);
}

main()
  .catch((error) => {
    console.error("❌ Erro ao rodar o seed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
