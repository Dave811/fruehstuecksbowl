export type SelectionType = 'none' | 'single' | 'multiple' | 'quantity' | 'display_only'

export interface Layer {
  id: string
  name: string
  sort_order: number
  selection_type: SelectionType
  quantity_options: string | null
  icon_url?: string | null
}

export interface Ingredient {
  id: string
  layer_id: string
  name: string
  sort_order: number
  portion_amount: number | null
  portion_unit: string | null
  package_amount: number | null
  package_unit: string | null
  package_label: string | null
  icon_url?: string | null
}

export interface Customer {
  id: string
  name: string
  date_of_birth: string
}

export interface Order {
  id: string
  customer_id: string
  delivery_date: string
  room?: string | null
  allergies?: string | null
  created_at: string
}

export interface OrderItem {
  id: string
  order_id: string
  ingredient_id: string
  quantity: number
}

export interface IngredientWithLayer extends Ingredient {
  layers?: Layer | null
}

export interface OrderWithDetails extends Order {
  customers?: Customer | null
  order_items?: (OrderItem & { ingredients?: IngredientWithLayer | null })[] | null
}
