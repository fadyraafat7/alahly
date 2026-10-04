export const formatPrice = (value: string | number, currency = 'USD') => new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 2 }).format(Number(value || 0))
export const discountPercent = (regular: string, sale: string) => {
  const regularValue = Number(regular); const saleValue = Number(sale)
  return regularValue > saleValue && saleValue > 0 ? Math.round((1 - saleValue / regularValue) * 100) : 0
}
