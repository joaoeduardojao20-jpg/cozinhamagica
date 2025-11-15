
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { Recipe, ShoppingList } from './types';
import { generateRecipeWithAI, rewriteRecipeWithAI, eraseFromRecipeWithAI } from './services/geminiService';
import { exportToPdf, exportToPng } from './services/exportService';

// --- CONSTANTS ---
const INGREDIENTS_LIST = [
  "Abacate", "Abobrinha", "Açúcar", "Alface", "Alho", "Arroz", "Azeite", "Batata", "Beringela", "Brócolis",
  "Carne (Bovina)", "Carne (Frango)", "Carne (Suína)", "Cebola", "Cenoura", "Cheiro-verde", "Chocolate",
  "Couve-flor", "Creme de Leite", "Farinha de Trigo", "Feijão", "Fermento", "Leite", "Leite Condensado",
  "Limão", "Macarrão", "Manteiga", "Milho", "Molho de Tomate", "Ovos", "Pão", "Pimenta", "Pimentão",
  "Queijo", "Sal", "Tomate", "Vinagre"
];

const APP_TITLE = "Cozinha Mágica";

enum View {
  DASHBOARD,
  MANUAL_EDITOR,
  AI_GENERATOR,
  COOKBOOK,
  SHOPPING_LIST,
  VIEW_RECIPE,
  VIEW_SHOPPING_LIST,
}

// --- ICONS (Heroicons) ---
const BookOpenIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>;
const ShoppingCartIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>;
const SparklesIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>;
const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;
const ArrowLeftIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>;

// --- LOCAL STORAGE HOOK ---
function useLocalStorage<T,>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(error);
    }
  };

  return [storedValue, setValue];
}

// --- UI COMPONENTS ---

const Header: React.FC<{ setView: (view: View) => void }> = ({ setView }) => (
    <header className="bg-chocolate text-cream p-4 shadow-lg text-center sticky top-0 z-20">
        <h1 onClick={() => setView(View.DASHBOARD)} className="font-serif text-3xl md:text-4xl font-bold cursor-pointer">{APP_TITLE}</h1>
    </header>
);

const MainButton: React.FC<{ onClick: () => void; icon: React.ReactNode; title: string; description: string }> = ({ onClick, icon, title, description }) => (
    <button onClick={onClick} className="bg-white/80 backdrop-blur-sm border border-chocolate/20 text-chocolate p-6 rounded-xl shadow-lg hover:shadow-2xl hover:scale-105 transform transition-all duration-300 w-full text-left flex flex-col items-center md:items-start md:flex-row space-y-4 md:space-y-0 md:space-x-6">
        <div className="bg-moss-green text-white p-4 rounded-full">{icon}</div>
        <div>
            <h2 className="text-xl font-bold font-serif">{title}</h2>
            <p className="mt-1 text-chocolate/80">{description}</p>
        </div>
    </button>
);

const ActionButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' }> = ({ children, variant = 'primary', ...props }) => {
    const baseClasses = "px-6 py-3 font-bold rounded-lg shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed";
    const variantClasses = {
        primary: 'bg-chocolate text-cream',
        secondary: 'bg-moss-green text-white',
        danger: 'bg-red-700 text-white',
    };
    return <button className={`${baseClasses} ${variantClasses[variant]}`} {...props}>{children}</button>;
};

const LoadingOverlay: React.FC<{ message: string }> = ({ message }) => (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center z-50">
        <div className="w-16 h-16 border-4 border-cream border-t-transparent rounded-full animate-spin"></div>
        <p className="text-cream text-xl mt-4 font-semibold">{message}</p>
    </div>
);

const RecipeForm: React.FC<{ recipe: Partial<Recipe>, onRecipeChange: (field: keyof Recipe, value: string) => void }> = ({ recipe, onRecipeChange }) => (
    <div className="space-y-4">
        <input type="text" placeholder="Título da Receita (opcional)" value={recipe.title || ''} onChange={e => onRecipeChange('title', e.target.value)} className="w-full p-3 rounded-lg border-2 border-chocolate/20 focus:border-moss-green focus:ring-moss-green" />
        <textarea placeholder="Ingredientes (um por linha)" value={recipe.ingredients || ''} onChange={e => onRecipeChange('ingredients', e.target.value)} rows={8} className="w-full p-3 rounded-lg border-2 border-chocolate/20 focus:border-moss-green focus:ring-moss-green" />
        <textarea placeholder="Modo de Preparo" value={recipe.preparation || ''} onChange={e => onRecipeChange('preparation', e.target.value)} rows={12} className="w-full p-3 rounded-lg border-2 border-chocolate/20 focus:border-moss-green focus:ring-moss-green" />
        <textarea placeholder="Observações (opcional)" value={recipe.notes || ''} onChange={e => onRecipeChange('notes', e.target.value)} rows={4} className="w-full p-3 rounded-lg border-2 border-chocolate/20 focus:border-moss-green focus:ring-moss-green" />
    </div>
);

const RecipeDisplay: React.FC<{ recipe: Recipe }> = ({ recipe }) => (
    <div id="recipe-view" className="bg-white p-6 sm:p-8 rounded-xl shadow-lg exporting:shadow-none exporting:border exporting:border-chocolate/20">
        <h2 className="font-serif text-3xl font-bold text-moss-green mb-2">{recipe.title}</h2>
        {recipe.description && <p className="text-chocolate/80 italic mb-6">{recipe.description}</p>}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {recipe.prepTime && <div><h4 className="font-bold">Tempo</h4><p>{recipe.prepTime}</p></div>}
            {recipe.difficulty && <div><h4 className="font-bold">Dificuldade</h4><p>{recipe.difficulty}</p></div>}
        </div>
        <div>
            <h3 className="font-serif text-2xl font-bold mb-4 border-b-2 border-moss-green/30 pb-2">Ingredientes</h3>
            <ul className="list-disc list-inside space-y-1 whitespace-pre-wrap">
                {recipe.ingredients.split('\n').map((item, i) => item.trim() && <li key={i}>{item.trim()}</li>)}
            </ul>
        </div>
        <div className="mt-8">
            <h3 className="font-serif text-2xl font-bold mb-4 border-b-2 border-moss-green/30 pb-2">Modo de Preparo</h3>
            <div className="space-y-3 whitespace-pre-wrap">{recipe.preparation}</div>
        </div>
        {recipe.extraSuggestions && <div className="mt-8"><h3 className="font-serif text-2xl font-bold mb-2">Sugestões Extras</h3><p>{recipe.extraSuggestions}</p></div>}
        {recipe.notes && <div className="mt-8 bg-cream/50 p-4 rounded-lg"><h3 className="font-serif text-xl font-bold mb-2">Observações</h3><p className="whitespace-pre-wrap">{recipe.notes}</p></div>}
    </div>
);

const MagicEraser: React.FC<{ onErase: (term: string) => void; disabled: boolean }> = ({ onErase, disabled }) => {
    const [term, setTerm] = useState('');
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (term.trim()) {
            onErase(term.trim());
            setTerm('');
        }
    };
    return (
        <form onSubmit={handleSubmit} className="mt-6 p-4 border-2 border-dashed border-moss-green/50 rounded-lg bg-white/50">
            <h3 className="font-serif text-xl font-bold mb-2">Borracha Mágica 🪄</h3>
            <p className="text-sm mb-3 text-chocolate/80">Digite um ingrediente ou frase para remover da receita inteira.</p>
            <div className="flex space-x-2">
                <input type="text" value={term} onChange={e => setTerm(e.target.value)} placeholder="Ex: Cebola" className="flex-grow p-2 rounded-lg border-2 border-chocolate/20" disabled={disabled} />
                <ActionButton type="submit" variant="secondary" disabled={!term.trim() || disabled}>Remover</ActionButton>
            </div>
        </form>
    );
};

// --- MAIN APP ---

export default function App() {
    const [view, setView] = useState<View>(View.DASHBOARD);
    const [recipes, setRecipes] = useLocalStorage<Recipe[]>('recipes', []);
    const [shoppingLists, setShoppingLists] = useLocalStorage<ShoppingList[]>('shoppingLists', []);
    const [activeRecipe, setActiveRecipe] = useState<Partial<Recipe> | null>(null);
    const [activeShoppingList, setActiveShoppingList] = useState<ShoppingList | null>(null);
    const [isLoading, setIsLoading] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const sortedRecipes = useMemo(() => [...recipes].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()), [recipes]);
    const sortedShoppingLists = useMemo(() => [...shoppingLists].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()), [shoppingLists]);

    useEffect(() => {
        if (error) {
            const timer = setTimeout(() => setError(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [error]);

    const handleSaveRecipe = useCallback((recipeToSave: Partial<Recipe>) => {
        if (!recipeToSave.title) {
            setError("O título da receita é obrigatório para salvar.");
            return;
        }

        setRecipes(prev => {
            const existingIndex = prev.findIndex(r => r.id === recipeToSave.id);
            if (existingIndex > -1) {
                const updatedRecipes = [...prev];
                updatedRecipes[existingIndex] = { ...prev[existingIndex], ...recipeToSave } as Recipe;
                return updatedRecipes;
            } else {
                const newRecipe: Recipe = {
                    id: crypto.randomUUID(),
                    title: 'Nova Receita',
                    ingredients: '',
                    preparation: '',
                    isAiGenerated: false,
                    createdAt: new Date().toISOString(),
                    ...recipeToSave
                };
                return [newRecipe, ...prev];
            }
        });
        setView(View.COOKBOOK);
        setActiveRecipe(null);
    }, [setRecipes]);
    
    const handleViewRecipe = (recipe: Recipe) => {
        setActiveRecipe(recipe);
        setView(View.VIEW_RECIPE);
    };

    const handleViewShoppingList = (list: ShoppingList) => {
        setActiveShoppingList(list);
        setView(View.VIEW_SHOPPING_LIST);
    };

    const handleDeleteRecipe = (id: string) => {
        if (window.confirm("Tem certeza que deseja remover esta receita?")) {
            setRecipes(prev => prev.filter(r => r.id !== id));
            if (activeRecipe?.id === id) {
              setActiveRecipe(null);
              setView(View.COOKBOOK);
            }
        }
    };

    const handleDeleteShoppingList = (id: string) => {
        if (window.confirm("Tem certeza que deseja remover esta lista de compras?")) {
            setShoppingLists(prev => prev.filter(sl => sl.id !== id));
            if (activeShoppingList?.id === id) {
              setActiveShoppingList(null);
              setView(View.SHOPPING_LIST);
            }
        }
    };
    
    // --- Manual Editor Logic ---
    const handleOpenManualEditor = (recipe: Recipe | null = null) => {
        setActiveRecipe(recipe || { title: '', ingredients: '', preparation: '', notes: '' });
        setView(View.MANUAL_EDITOR);
    };

    const handleRecipeChange = (field: keyof Recipe, value: string) => {
        setActiveRecipe(prev => prev ? { ...prev, [field]: value } : null);
    };
    
    const handleRewrite = async () => {
        if (!activeRecipe) return;
        setIsLoading("Reescrevendo com IA...");
        setError(null);
        try {
            const rewrittenRecipe = await rewriteRecipeWithAI(activeRecipe);
            setActiveRecipe(prev => prev ? { ...prev, ...rewrittenRecipe, isAiGenerated: true } : null);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsLoading(null);
        }
    };
    
    // --- AI Generator Logic ---
    const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);

    const handleGenerateRecipe = async () => {
        if (selectedIngredients.length === 0) {
            setError("Selecione pelo menos um ingrediente.");
            return;
        }
        setIsLoading("Gerando sua receita mágica...");
        setError(null);
        try {
            const generatedRecipe = await generateRecipeWithAI(selectedIngredients);
            setActiveRecipe({ ...generatedRecipe, isAiGenerated: true });
            setView(View.MANUAL_EDITOR); // Go to editor to view/save
        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsLoading(null);
        }
    };

    // --- Magic Eraser Logic ---
    const handleErase = async (term: string) => {
        if (!activeRecipe) return;
        setIsLoading(`Removendo "${term}"...`);
        setError(null);
        try {
            const erasedRecipe = await eraseFromRecipeWithAI(activeRecipe, term);
            setActiveRecipe(prev => prev ? { ...prev, ...erasedRecipe } : null);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsLoading(null);
        }
    };

    // --- Shopping List Logic ---
    const [shopListModalData, setShopListModalData] = useState<{ recipe: Recipe | null }>({ recipe: null });
    const [shopListForm, setShopListForm] = useState({ market: '', store: '', date: '', time: '', extraItems: ''});

    const openShopListModal = (recipe: Recipe) => {
        setShopListForm({ market: '', store: '', date: '', time: '', extraItems: ''});
        setShopListModalData({ recipe });
    };

    const handleCreateShoppingList = () => {
      const { recipe } = shopListModalData;
      if(!recipe) return;
      const newList: ShoppingList = {
        id: crypto.randomUUID(),
        recipeId: recipe.id,
        recipeTitle: recipe.title,
        ingredients: recipe.ingredients,
        createdAt: new Date().toISOString(),
        ...shopListForm
      };
      setShoppingLists(prev => [newList, ...prev]);
      setShopListModalData({ recipe: null });
      setView(View.SHOPPING_LIST);
    };
    
    const renderView = () => {
        switch (view) {
            case View.DASHBOARD:
                return (
                    <div className="space-y-6">
                        <MainButton onClick={() => handleOpenManualEditor()} icon={<PlusIcon />} title="Criar Receita Manualmente" description="Escreva sua receita e use a IA para aprimorá-la." />
                        <MainButton onClick={() => { setSelectedIngredients([]); setView(View.AI_GENERATOR); }} icon={<SparklesIcon />} title="Gerar Receita com IA" description="Selecione seus ingredientes e deixe a mágica acontecer." />
                    </div>
                );

            case View.MANUAL_EDITOR:
                if (!activeRecipe) return null;
                return (
                    <div>
                        <RecipeForm recipe={activeRecipe} onRecipeChange={handleRecipeChange} />
                        <div className="mt-6 flex flex-wrap gap-4">
                            <ActionButton onClick={() => handleSaveRecipe(activeRecipe)} disabled={!activeRecipe.title}>Salvar Receita</ActionButton>
                            <ActionButton onClick={handleRewrite} variant="secondary" disabled={isLoading !== null}>🧠 Reescrever com IA</ActionButton>
                        </div>
                        <MagicEraser onErase={handleErase} disabled={isLoading !== null} />
                    </div>
                );
            
            case View.AI_GENERATOR:
                return (
                    <div>
                        <h2 className="font-serif text-2xl font-bold mb-4">Selecione os ingredientes que você tem:</h2>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-6">
                            {INGREDIENTS_LIST.map(ing => (
                                <label key={ing} className={`p-3 rounded-lg border-2 cursor-pointer transition-colors ${selectedIngredients.includes(ing) ? 'bg-moss-green text-white border-moss-green' : 'bg-white/70 border-chocolate/20'}`}>
                                    <input type="checkbox" checked={selectedIngredients.includes(ing)} onChange={() => setSelectedIngredients(prev => prev.includes(ing) ? prev.filter(i => i !== ing) : [...prev, ing])} className="mr-2" />
                                    {ing}
                                </label>
                            ))}
                        </div>
                        <ActionButton onClick={handleGenerateRecipe} disabled={selectedIngredients.length === 0 || isLoading !== null}>Gerar Receita</ActionButton>
                    </div>
                );

            case View.COOKBOOK:
                return (
                    <div>
                        <h2 className="font-serif text-2xl font-bold mb-4">Seu Livro de Receitas</h2>
                        {sortedRecipes.length === 0 ? <p>Nenhuma receita salva ainda.</p> : (
                            <div className="space-y-3">
                                {sortedRecipes.map(recipe => (
                                    <div key={recipe.id} onClick={() => handleViewRecipe(recipe)} className="bg-white/80 p-4 rounded-lg shadow-sm hover:shadow-md cursor-pointer flex justify-between items-center transition-shadow">
                                        <div>
                                            <h3 className="font-bold text-lg">{recipe.title}</h3>
                                            <p className="text-sm text-chocolate/70">{new Date(recipe.createdAt).toLocaleDateString()}</p>
                                        </div>
                                        <button onClick={(e) => { e.stopPropagation(); handleDeleteRecipe(recipe.id); }} className="text-red-700 hover:text-red-500 p-2 rounded-full"><TrashIcon /></button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                );

            case View.SHOPPING_LIST:
              return (
                <div>
                  <h2 className="font-serif text-2xl font-bold mb-4">Suas Listas de Compras</h2>
                  {sortedShoppingLists.length === 0 ? <p>Nenhuma lista de compras criada.</p> : (
                      <div className="space-y-3">
                          {sortedShoppingLists.map(list => (
                              <div key={list.id} onClick={() => handleViewShoppingList(list)} className="bg-white/80 p-4 rounded-lg shadow-sm hover:shadow-md cursor-pointer flex justify-between items-center transition-shadow">
                                  <div>
                                      <h3 className="font-bold text-lg">Lista para: {list.recipeTitle}</h3>
                                      <p className="text-sm text-chocolate/70">{new Date(list.createdAt).toLocaleDateString()}</p>
                                  </div>
                                  <button onClick={(e) => { e.stopPropagation(); handleDeleteShoppingList(list.id); }} className="text-red-700 hover:text-red-500 p-2 rounded-full"><TrashIcon /></button>
                              </div>
                          ))}
                      </div>
                  )}
                </div>
              );
            
            case View.VIEW_RECIPE:
              if (!activeRecipe || !('id' in activeRecipe)) return null;
              const fullRecipe = activeRecipe as Recipe;
              return (
                  <div>
                      <RecipeDisplay recipe={fullRecipe} />
                      <div className="mt-6 flex flex-wrap gap-4">
                        <ActionButton onClick={() => handleOpenManualEditor(fullRecipe)}>Editar</ActionButton>
                        <ActionButton onClick={() => openShopListModal(fullRecipe)} variant="secondary">Enviar para Lista de Compras</ActionButton>
                        <ActionButton onClick={() => exportToPdf('recipe-view', fullRecipe.title)} variant="secondary">Exportar PDF</ActionButton>
                        <ActionButton onClick={() => exportToPng('recipe-view', fullRecipe.title)} variant="secondary">Exportar PNG</ActionButton>
                        <ActionButton onClick={() => handleDeleteRecipe(fullRecipe.id)} variant="danger">Remover</ActionButton>
                      </div>
                  </div>
              );

            case View.VIEW_SHOPPING_LIST:
              if (!activeShoppingList) return null;
              return (
                  <div>
                      <div id="shoppinglist-view" className="bg-white p-6 sm:p-8 rounded-xl shadow-lg exporting:shadow-none exporting:border exporting:border-chocolate/20">
                          <h2 className="font-serif text-3xl font-bold text-moss-green mb-4">Lista de Compras</h2>
                          <p className='mb-6'>Para a receita: <strong>{activeShoppingList.recipeTitle}</strong></p>
                          <div className='grid grid-cols-2 gap-4 mb-6 text-sm'>
                              {activeShoppingList.market && <p><strong>Mercado:</strong> {activeShoppingList.market}</p>}
                              {activeShoppingList.store && <p><strong>Loja:</strong> {activeShoppingList.store}</p>}
                              {activeShoppingList.date && <p><strong>Data:</strong> {activeShoppingList.date}</p>}
                              {activeShoppingList.time && <p><strong>Horário:</strong> {activeShoppingList.time}</p>}
                          </div>
                          <h3 className="font-serif text-2xl font-bold mb-4 border-b-2 border-moss-green/30 pb-2">Itens da Receita</h3>
                          <ul className="list-disc list-inside space-y-1 whitespace-pre-wrap mb-6">
                            {activeShoppingList.ingredients.split('\n').map((item, i) => item.trim() && <li key={i}>{item.trim()}</li>)}
                          </ul>
                          {activeShoppingList.extraItems && (
                            <>
                              <h3 className="font-serif text-2xl font-bold mb-4 border-b-2 border-moss-green/30 pb-2">Itens Extras</h3>
                              <ul className="list-disc list-inside space-y-1 whitespace-pre-wrap">
                                {activeShoppingList.extraItems.split('\n').map((item, i) => item.trim() && <li key={i}>{item.trim()}</li>)}
                              </ul>
                            </>
                          )}
                      </div>
                      <div className="mt-6 flex flex-wrap gap-4">
                        <ActionButton onClick={() => exportToPdf('shoppinglist-view', `lista-${activeShoppingList.recipeTitle}`)} variant="secondary">Baixar PDF</ActionButton>
                        <ActionButton onClick={() => exportToPng('shoppinglist-view', `lista-${activeShoppingList.recipeTitle}`)} variant="secondary">Baixar PNG</ActionButton>
                      </div>
                  </div>
              );
        }
    };

    const shouldShowBackButton = view !== View.DASHBOARD;
    const handleBack = () => {
      switch (view) {
        case View.MANUAL_EDITOR:
        case View.AI_GENERATOR:
          setView(View.DASHBOARD);
          break;
        case View.VIEW_RECIPE:
          setView(View.COOKBOOK);
          break;
        case View.VIEW_SHOPPING_LIST:
          setView(View.SHOPPING_LIST);
          break;
        default:
          setView(View.DASHBOARD);
      }
      setActiveRecipe(null);
      setActiveShoppingList(null);
    }
    
    return (
        <div className="min-h-screen bg-cream">
            <Header setView={setView} />
            
            {isLoading && <LoadingOverlay message={isLoading} />}
            
            {error && (
                <div className="bg-red-500 text-white p-4 m-4 rounded-lg shadow-lg text-center">
                    <strong>Erro:</strong> {error}
                </div>
            )}

            {shopListModalData.recipe && (
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 flex items-center justify-center p-4">
                <div className="bg-cream p-6 rounded-xl shadow-2xl max-w-lg w-full">
                  <h2 className="font-serif text-2xl font-bold mb-4">Adicionar à Lista de Compras</h2>
                  <p className='mb-4'>Adicione informações opcionais para a lista de <strong>{shopListModalData.recipe.title}</strong>.</p>
                  <div className='space-y-3'>
                    <input type="text" placeholder="Mercado" value={shopListForm.market} onChange={e => setShopListForm(f => ({...f, market: e.target.value}))} className="w-full p-2 rounded-lg border-2" />
                    <input type="text" placeholder="Loja" value={shopListForm.store} onChange={e => setShopListForm(f => ({...f, store: e.target.value}))} className="w-full p-2 rounded-lg border-2" />
                    <input type="date" placeholder="Data" value={shopListForm.date} onChange={e => setShopListForm(f => ({...f, date: e.target.value}))} className="w-full p-2 rounded-lg border-2" />
                    <input type="time" placeholder="Horário" value={shopListForm.time} onChange={e => setShopListForm(f => ({...f, time: e.target.value}))} className="w-full p-2 rounded-lg border-2" />
                    <textarea placeholder="Itens extras (um por linha)" value={shopListForm.extraItems} onChange={e => setShopListForm(f => ({...f, extraItems: e.target.value}))} rows={3} className="w-full p-2 rounded-lg border-2" />
                  </div>
                  <div className="flex justify-end gap-3 mt-4">
                    <button onClick={() => setShopListModalData({ recipe: null })} className="px-4 py-2 rounded-lg">Cancelar</button>
                    <ActionButton onClick={handleCreateShoppingList}>Criar Lista</ActionButton>
                  </div>
                </div>
              </div>
            )}

            <main className="p-4 sm:p-6 max-w-4xl mx-auto">
                {shouldShowBackButton && (
                    <button onClick={handleBack} className="flex items-center space-x-2 text-moss-green font-bold mb-6 hover:underline">
                        <ArrowLeftIcon />
                        <span>Voltar</span>
                    </button>
                )}
                {renderView()}
            </main>

            <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-sm shadow-[0_-4px_10px_rgba(0,0,0,0.05)] p-2 flex justify-around">
                <button onClick={() => setView(View.COOKBOOK)} className={`flex flex-col items-center p-2 rounded-lg w-full ${view === View.COOKBOOK || view === View.VIEW_RECIPE ? 'text-moss-green' : 'text-chocolate/70'}`}>
                    <BookOpenIcon />
                    <span className="text-xs font-bold">Receitas</span>
                </button>
                <button onClick={() => setView(View.SHOPPING_LIST)} className={`flex flex-col items-center p-2 rounded-lg w-full ${view === View.SHOPPING_LIST || view === View.VIEW_SHOPPING_LIST ? 'text-moss-green' : 'text-chocolate/70'}`}>
                    <ShoppingCartIcon />
                    <span className="text-xs font-bold">Compras</span>
                </button>
            </nav>
            <div className="h-20"></div> {/* Spacer for bottom nav */}
        </div>
    );
}
