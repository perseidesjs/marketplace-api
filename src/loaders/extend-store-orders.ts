export default async function (): Promise<void> {
    const module = await import('@medusajs/medusa/dist/api/routes/store/orders/index')

    Object.assign(module, {
        ...module,
        defaultStoreOrdersRelations: [...module.defaultStoreOrdersRelations, 'shipping_methods.shipping_option.store'],
        allowedStoreOrdersRelations: [...module.allowedStoreOrdersRelations, 'shipping_methods.shipping_option.store'],
    })
}