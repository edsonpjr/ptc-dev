import { Request, Response } from "express";
import { Luminosidade, Prisma } from "@prisma/client";
import * as PlantaRepository from "@repositories/PlantaRepository";

type DadosPlanta = {
  nome?: unknown;
  especie?: unknown;
  preco?: unknown;
  estoque?: unknown;
  luminosidade?: unknown;
  petFriendly?: unknown;
  regaACadaDias?: unknown;
};

// Valida só os campos que vieram (undefined passa direto).
// No create, o chamador garante antes que nenhum obrigatório está faltando.
function validarCamposPlanta(dados: DadosPlanta): string | null {
  const { nome, especie, preco, estoque, luminosidade, petFriendly, regaACadaDias } = dados;

  if (nome !== undefined && !(typeof nome === "string" && nome.trim() !== "")) {
    return "nome deve ser um texto não vazio.";
  }
  if (especie !== undefined && !(typeof especie === "string" && especie.trim() !== "")) {
    return "especie deve ser um texto não vazio.";
  }
  if (preco !== undefined && !(Number.isInteger(preco) && (preco as number) > 0)) {
    return "preco deve ser um inteiro maior que zero (em centavos).";
  }
  if (estoque !== undefined && !(Number.isInteger(estoque) && (estoque as number) >= 0)) {
    return "estoque deve ser um inteiro maior ou igual a zero.";
  }
  if (luminosidade !== undefined && !Object.values(Luminosidade).includes(luminosidade as Luminosidade)) {
    return "luminosidade deve ser SOMBRA, MEIA_SOMBRA ou SOL_PLENO.";
  }
  if (petFriendly !== undefined && typeof petFriendly !== "boolean") {
    return "petFriendly deve ser um booleano.";
  }
  if (regaACadaDias !== undefined && !(Number.isInteger(regaACadaDias) && (regaACadaDias as number) >= 1)) {
    return "regaACadaDias deve ser um inteiro maior ou igual a 1.";
  }

  return null;
}

export const createPlanta = async (req: Request, res: Response) => {
  try {
    const { nome, especie, preco, estoque, luminosidade, petFriendly, regaACadaDias } = req.body;

    if (
      nome === undefined ||
      especie === undefined ||
      preco === undefined ||
      estoque === undefined ||
      luminosidade === undefined ||
      petFriendly === undefined ||
      regaACadaDias === undefined
    ) { return res.status(400).json({ message: "Preencha todos os campos obrigatórios." }); }

    const erro = validarCamposPlanta({ nome, especie, preco, estoque, luminosidade, petFriendly, regaACadaDias });
    if (erro) { return res.status(400).json({ message: erro }); }

    const planta = await PlantaRepository.createPlanta({
      nome,
      especie,
      preco,
      estoque,
      luminosidade,
      petFriendly,
      regaACadaDias,
    });

    return res.status(201).json(planta);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erro ao criar planta." });
  }
};

export const readPlantaById = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: "id inválido." });
    }

    const planta = await PlantaRepository.findPlantaById(id);

    if (!planta) {
      return res.status(404).json({ message: "Planta não encontrada." });
    }

    return res.status(200).json(planta);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erro ao buscar planta." });
  }
};

export const updatePlanta = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: "id inválido." });
    }

    const plantaExistente = await PlantaRepository.findPlantaById(id);

    if (!plantaExistente) {
      return res.status(404).json({ message: "Planta não encontrada." });
    }

    const { nome, especie, preco, estoque, luminosidade, petFriendly, regaACadaDias } = req.body;

    const erro = validarCamposPlanta({ nome, especie, preco, estoque, luminosidade, petFriendly, regaACadaDias });
    if (erro) {
      return res.status(400).json({ message: erro });
    }

    const plantaAtualizada = await PlantaRepository.updatePlanta(id, {
      nome,
      especie,
      preco,
      estoque,
      luminosidade,
      petFriendly,
      regaACadaDias,
    });
    return res.status(200).json(plantaAtualizada);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erro ao atualizar planta." });
  }
};

export const deletePlanta = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: "id inválido." });
    }

    const plantaExistente = await PlantaRepository.findPlantaById(id);

    if (!plantaExistente) {
      return res.status(404).json({ message: "Planta não encontrada." });
    }

    await PlantaRepository.deletePlanta(id);
    return res.status(204).send();
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erro ao deletar planta." });
  }
};

export const readAllPlantas = async (req: Request, res: Response) => {
  try {
    const { luminosidade, petFriendly, nome, ordem } = req.query;

    let luminosidadeFiltro: Luminosidade | undefined;
    if (luminosidade !== undefined) {
      if (!Object.values(Luminosidade).includes(luminosidade as Luminosidade)) {
        return res.status(400).json({ message: "luminosidade deve ser SOMBRA, MEIA_SOMBRA ou SOL_PLENO." });
      }
      luminosidadeFiltro = luminosidade as Luminosidade;
    }

    let petFriendlyFiltro: boolean | undefined;
    if (petFriendly !== undefined) {
      if (petFriendly !== "true" && petFriendly !== "false") {
        return res.status(400).json({ message: "petFriendly deve ser true ou false." });
      }
      petFriendlyFiltro = petFriendly === "true";
    }

    let nomeFiltro: Prisma.StringFilter | undefined;
    if (nome !== undefined) {
      if (typeof nome !== "string" || nome.trim() === "") {
        return res.status(400).json({ message: "nome deve ser um texto não vazio." });
      }
      nomeFiltro = { contains: nome, mode: "insensitive" };
    }

    const ORDENS_VALIDAS = ["preco", "nome"] as const;
    let orderByFiltro: Prisma.PlantaOrderByWithRelationInput | undefined;
    if (ordem !== undefined) {
      if (!ORDENS_VALIDAS.includes(ordem as any)) {
        return res.status(400).json({ message: "ordem deve ser preco ou nome." });
      }
      orderByFiltro = { [ordem as string]: "asc" };
    }

    const plantas = await PlantaRepository.findAllPlantas({
      luminosidade: luminosidadeFiltro,
      petFriendly: petFriendlyFiltro,
      nome: nomeFiltro,
      orderBy: orderByFiltro,
    });

    return res.status(200).json(plantas);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erro ao buscar plantas." });
  }
};

export const venderPlanta = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: "id inválido." });
    }

    const { quantidade } = req.body;
    if (!Number.isInteger(quantidade) || quantidade <= 0) {
      return res.status(400).json({ message: "quantidade deve ser um inteiro maior que zero." });
    }

    const planta = await PlantaRepository.findPlantaById(id);
    if (!planta) {
      return res.status(404).json({ message: "Planta não encontrada." });
    }

    const resultado = await PlantaRepository.decrementEstoqueSeDisponivel(id, quantidade);

    if (resultado.count === 0) {
      const plantaAtual = await PlantaRepository.findPlantaById(id);
      return res.status(400).json({ message: `Temos só ${plantaAtual?.estoque ?? 0} vasos em estoque.` });
    }

    const plantaAtualizada = await PlantaRepository.findPlantaById(id);
    return res.status(200).json(plantaAtualizada);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erro ao vender planta." });
  }
};

export const valorTotalEstoque = async (req: Request, res: Response) => {
  try {
    const plantas = await PlantaRepository.findPlantasParaValorTotal();

    const { valorTotalEmCentavos, totalDeVasos } = plantas.reduce(
      (acc, planta) => ({
        valorTotalEmCentavos: acc.valorTotalEmCentavos + planta.preco * planta.estoque,
        totalDeVasos: acc.totalDeVasos + planta.estoque,
      }),
      { valorTotalEmCentavos: 0, totalDeVasos: 0 }
    );

    return res.status(200).json({ valorTotalEmCentavos, totalDeVasos });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erro ao calcular valor total do estoque." });
  }
};

export const readPlantasEsgotadas = async (req: Request, res: Response) => {
  try {
    const plantas = await PlantaRepository.findPlantasEsgotadas();
    return res.status(200).json(plantas);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erro ao buscar plantas esgotadas." });
  }
};
