
import { GoogleGenAI, Type } from "@google/genai";
import type { Recipe } from '../types';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const recipeSchema = {
    type: Type.OBJECT,
    properties: {
        title: { type: Type.STRING, description: "Título da receita" },
        description: { type: Type.STRING, description: "Uma breve descrição da receita." },
        ingredients: { type: Type.STRING, description: "Lista de ingredientes, formatada com um item por linha." },
        preparation: { type: Type.STRING, description: "Passo a passo do modo de preparo." },
        prepTime: { type: Type.STRING, description: "Tempo estimado de preparo." },
        difficulty: { type: Type.STRING, description: "Nível de dificuldade (e.g., Fácil, Médio, Difícil)." },
        extraSuggestions: { type: Type.STRING, description: "Sugestões extras ou dicas." },
        notes: { type: Type.STRING, description: "Observações úteis sobre a receita." },
    },
    required: ["title", "ingredients", "preparation"]
};


export const generateRecipeWithAI = async (selectedIngredients: string[]): Promise<Partial<Recipe>> => {
    try {
        const prompt = `Crie uma receita completa e deliciosa usando APENAS os seguintes ingredientes: ${selectedIngredients.join(', ')}. Não adicione NENHUM outro ingrediente que não esteja nesta lista. Gere um título criativo e uma descrição. O resultado deve ser retornado em formato JSON.`;
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: recipeSchema,
            }
        });

        const text = response.text.trim();
        return JSON.parse(text);

    } catch (error) {
        console.error("Error generating recipe with AI:", error);
        throw new Error("Não foi possível gerar a receita. Tente novamente.");
    }
};

export const rewriteRecipeWithAI = async (recipe: Partial<Recipe>): Promise<Partial<Recipe>> => {
    try {
        const prompt = `Reescreva a seguinte receita para ser mais profissional, clara e com um toque gourmet. Melhore a clareza, padronize o formato, organize os ingredientes e as etapas, corrija possíveis erros e ajuste a linguagem.
        Receita Original:
        Título: ${recipe.title}
        Ingredientes: ${recipe.ingredients}
        Modo de Preparo: ${recipe.preparation}
        Observações: ${recipe.notes}
        
        Retorne o resultado em formato JSON.`;
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: recipeSchema
            }
        });
        
        const text = response.text.trim();
        return JSON.parse(text);
    } catch (error) {
        console.error("Error rewriting recipe with AI:", error);
        throw new Error("Não foi possível reescrever a receita. Tente novamente.");
    }
};

export const eraseFromRecipeWithAI = async (recipe: Partial<Recipe>, termToErase: string): Promise<Partial<Recipe>> => {
    try {
        const prompt = `Reescreva a seguinte receita, removendo completamente qualquer menção de "${termToErase}". A remoção deve acontecer na lista de ingredientes, no modo de preparo e em qualquer outra parte da receita. Mantenha a estrutura e o restante do conteúdo.
        Receita Original:
        Título: ${recipe.title}
        Ingredientes: ${recipe.ingredients}
        Modo de Preparo: ${recipe.preparation}
        Observações: ${recipe.notes}
        
        Retorne o resultado em formato JSON.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: recipeSchema
            }
        });
        
        const text = response.text.trim();
        return JSON.parse(text);
    } catch (error) {
        console.error("Error with Magic Eraser:", error);
        throw new Error("A Borracha Mágica falhou. Tente novamente.");
    }
};
