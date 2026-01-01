// Sale types
export type SaleType = 'QUICK' | 'RESERVATION' | 'CREDIT';

// Reservation status
export type ReservationStatus = 'PENDING' | 'COMPLETED' | 'CANCELLED';

// Product interface
export interface Product {
    id: string;
    name: string;
    description: string | null;
    price: number;
    stock: number;
    reserved_stock: number;
    created_at: string;
}

// Sale interface
export interface Sale {
    id: string;
    product_id: number;
    product_name: string;
    quantity: number;
    unit_price: number;
    total: number;
    sale_type: SaleType;
    customer_name: string | null;
    notes: string | null;
    sale_date: string;
    created_at: string;
}

// Reservation interface
export interface Reservation {
    id: string;
    product_id: number;
    product_name: string;
    quantity: number;
    customer_name: string;
    customer_phone: string | null;
    reservation_date: string;
    delivery_date: string;
    status: ReservationStatus;
    notes: string | null;
    created_at: string;
}
