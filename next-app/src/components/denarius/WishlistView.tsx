'use client';

import { useState } from 'react';
import { WishlistItem, Currency } from '@/types/denarius';
import Button from '@/components/ui/Button';
import { PlusIcon, TrashIcon, GiftIcon, SparklesIcon, PencilIcon } from '@heroicons/react/24/outline';
import { getCurrencySymbol, formatNumberWithLocale } from '@/lib/currency';
import ConfirmModal from '@/components/ui/ConfirmModal';
import AccountModal from '@/components/ui/AccountModal';

interface WishlistViewProps {
    wishlist: WishlistItem[];
    onAddItem: (
        name: string,
        price: number,
        currency: Currency,
        details: string
    ) => Promise<void>;
    onUpdateItem?: (id: string, data: Partial<WishlistItem>) => Promise<void>;
    onDeleteItem: (id: string) => Promise<void>;
}

export default function WishlistView({
    wishlist,
    onAddItem,
    onUpdateItem,
    onDeleteItem,
}: WishlistViewProps) {
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editData, setEditData] = useState({ id: '', product_name: '', price: '', currency: 'USD' as Currency, details: '' });

    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [deletingName, setDeletingName] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!editData.product_name.trim() || !editData.price) return;

        setLoading(true);
        try {
            if (editData.id && onUpdateItem) {
                await onUpdateItem(editData.id, {
                    product_name: editData.product_name,
                    price: parseFloat(editData.price),
                    currency: editData.currency,
                    details: editData.details
                });
            } else {
                await onAddItem(editData.product_name, parseFloat(editData.price), editData.currency, editData.details);
            }

            setEditData({ id: '', product_name: '', price: '', currency: 'USD', details: '' });
            setEditModalOpen(false);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const openCreateModal = () => {
        setEditData({ id: '', product_name: '', price: '', currency: 'USD', details: '' });
        setEditModalOpen(true);
    };

    const openEditModal = (item: WishlistItem) => {
        setEditData({
            id: item.id,
            product_name: item.product_name,
            price: String(item.price),
            currency: item.currency,
            details: item.details || ''
        });
        setEditModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!deletingId) return;
        setLoading(true);
        try {
            await onDeleteItem(deletingId);
        } catch (error) {
            console.error(error);
        }
        setDeletingId(null);
        setLoading(false);
    };

    return (
        <div className="animate-fade-in space-y-6">
            {/* Header & Stats */}
            <div className="flex items-center justify-between px-2">
                <div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        Wishlist <SparklesIcon className="w-5 h-5 text-indigo-400" />
                    </h3>
                    <p className="text-xs text-slate-400 font-medium">
                        {wishlist.length} {wishlist.length === 1 ? 'item' : 'items'} por cumplir
                    </p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30 hover:scale-105 active:scale-95 transition"
                >
                    <PlusIcon className="w-6 h-6" />
                </button>
            </div>

            {/* Wishlist Grid */}
            {wishlist.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center opacity-50">
                    <div className="w-24 h-24 rounded-full bg-slate-800 flex items-center justify-center mb-4">
                        <GiftIcon className="w-12 h-12 text-slate-600" />
                    </div>
                    <p className="text-slate-400 font-medium">Tu lista está vacía</p>
                    <p className="text-xs text-slate-500 mt-1">Agrega algo que quieras comprar</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-4 pb-24">
                    {wishlist.map((item, index) => (
                        <div
                            key={item.id}
                            className="group relative overflow-hidden rounded-2xl bg-gradient-to-b from-slate-800/80 to-slate-900/80 backdrop-blur-md p-4 border border-white/5 shadow-lg hover:border-indigo-500/30 transition-all duration-300 animate-fade-in"
                            style={{ animationDelay: `${index * 50}ms` }}
                        >
                            {/* Decorative Background Icon */}
                            <GiftIcon className="absolute -bottom-4 -right-4 w-24 h-24 text-white/5 group-hover:text-indigo-500/10 group-hover:scale-110 transition-all duration-500" />

                            <div className="relative z-10 flex flex-col h-full">
                                <div className="flex-1">
                                    <h4 className="text-sm font-bold text-white leading-tight mb-2 line-clamp-2">
                                        {item.product_name}
                                    </h4>
                                    {item.details && (
                                        <p className="text-[10px] text-slate-400 line-clamp-2 mb-3 leading-relaxed">
                                            {item.details}
                                        </p>
                                    )}
                                </div>

                                <div className="mt-3 pt-3 border-t border-white/5 flex justify-between items-end">
                                    <div>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">Precio</p>
                                        <p className="text-lg font-mono font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-blue-400">
                                            {getCurrencySymbol(item.currency)}{formatNumberWithLocale(Number(item.price))}
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                openEditModal(item);
                                            }}
                                            className="w-8 h-8 -mb-1 rounded-full text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 flex items-center justify-center transition"
                                        >
                                            <PencilIcon className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setDeletingId(item.id);
                                                setDeletingName(item.product_name);
                                            }}
                                            className="w-8 h-8 -mr-1 -mb-1 rounded-full text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 flex items-center justify-center transition"
                                        >
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Add/Edit Item Modal */}
            <AccountModal
                isOpen={editModalOpen}
                onClose={() => setEditModalOpen(false)}
                title={editData.id ? "Editar Item" : "Nuevo Item"}
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2 ml-1">¿Qué deseas?</label>
                        <input
                            type="text"
                            value={editData.product_name}
                            onChange={(e) => setEditData({ ...editData, product_name: e.target.value })}
                            placeholder="Nombre del producto"
                            className="w-full input-modern p-4 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500/50"
                        />
                    </div>

                    <div className="flex gap-3">
                        <div className="w-2/3">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2 ml-1">Precio</label>
                            <input
                                type="number"
                                value={editData.price}
                                onChange={(e) => setEditData({ ...editData, price: e.target.value })}
                                placeholder="0.00"
                                step="0.01"
                                className="w-full input-modern p-4 rounded-xl text-white placeholder-slate-500"
                            />
                        </div>
                        <div className="w-1/3">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2 ml-1">Moneda</label>
                            <select
                                value={editData.currency}
                                onChange={(e) => setEditData({ ...editData, currency: e.target.value as Currency })}
                                className="w-full input-modern p-4 rounded-xl text-white bg-slate-800"
                            >
                                <option value="USD" className="bg-slate-800">USD</option>
                                <option value="VES" className="bg-slate-800">VES</option>
                                <option value="USDT" className="bg-slate-800">USDT</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2 ml-1">Detalles (Opcional)</label>
                        <textarea
                            value={editData.details}
                            onChange={(e) => setEditData({ ...editData, details: e.target.value })}
                            placeholder="Link, tienda, color, etc..."
                            className="w-full input-modern p-4 rounded-xl text-white placeholder-slate-500 min-h-[100px] resize-none"
                        />
                    </div>

                    <button
                        onClick={handleSubmit}
                        disabled={loading || !editData.product_name.trim() || !editData.price}
                        className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-indigo-600/20 transition transform active:scale-95 disabled:opacity-50 mt-2"
                    >
                        {loading ? 'Guardando...' : (editData.id ? 'Guardar Cambios' : 'Añadir a Wishlist')}
                    </button>
                </div>
            </AccountModal>

            <ConfirmModal
                isOpen={!!deletingId}
                onClose={() => setDeletingId(null)}
                onConfirm={confirmDelete}
                title="Eliminar Deseo"
                message={`¿Estás seguro de que quieres eliminar "${deletingName}" de tu lista de deseos?`}
                confirmText="Sí, eliminar"
            />
        </div>
    );
}
