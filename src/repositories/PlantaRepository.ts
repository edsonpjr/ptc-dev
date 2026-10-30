import { Prisma, Luminosidade } from "@prisma/client";
import prisma from "@database";

export const createPlanta = async (data: Prisma.PlantaCreateInput) => {
  return await prisma.planta.create({ data });
};

type FiltrosPlanta = {
  luminosidade?: Luminosidade;
  petFriendly?: boolean;
  nome?: Prisma.StringFilter;
  orderBy?: Prisma.PlantaOrderByWithRelationInput;
};

export const findAllPlantas = async (filtros: FiltrosPlanta) => {
  return await prisma.planta.findMany({
    where: {
      luminosidade: filtros.luminosidade,
      petFriendly: filtros.petFriendly,
      nome: filtros.nome,
    },
    orderBy: filtros.orderBy,
  });
};

export const findPlantaById = async (id: number) => {
  return await prisma.planta.findUnique({ where: { id } });
};

export const updatePlanta = async (id: number, data: Prisma.PlantaUpdateInput) => {
  return await prisma.planta.update({ where: { id }, data });
};

export const deletePlanta = async (id: number) => {
  return await prisma.planta.delete({ where: { id } });
};

export const decrementEstoque = async (id: number, quantidade: number) => {
  return await prisma.planta.update({
    where: { id },
    data: { estoque: { decrement: quantidade } },
  });
};

export const decrementEstoqueSeDisponivel = async (id: number, quantidade: number) => {
  return await prisma.planta.updateMany({
    where: { id, estoque: { gte: quantidade } },
    data: { estoque: { decrement: quantidade } },
  });
};

export const findPlantasParaValorTotal = async () => {
  return await prisma.planta.findMany({
    select: { preco: true, estoque: true },
  });
};

export const findPlantasEsgotadas = async () => {
  return await prisma.planta.findMany({ where: { estoque: 0 } });
};
