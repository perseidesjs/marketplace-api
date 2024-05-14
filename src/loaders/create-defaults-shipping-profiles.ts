import { Logger, MedusaContainer } from '@medusajs/medusa'
import type StoreRepository from '@medusajs/medusa/dist/repositories/store'
import type ShippingProfileService from '../services/shipping-profile'

export default async function (container: MedusaContainer): Promise<void> {
    const shippingProfileService = container.resolve<ShippingProfileService>('shippingProfileService')
    const storeRepo = container.resolve<typeof StoreRepository>('storeRepository')
    const logger = container.resolve<Logger>('logger')

    const allStores = await storeRepo.find({
        select: ['id'],
    })

    if (!allStores.length) {
        return
    }

    const allShippingProfiles = await shippingProfileService.list()

    for (const store of allStores) {
        const storeId = store.id

        // For each store, we check that there is a default shipping profile
        // if not, we create one
        if (!allShippingProfiles.find((profile) => profile.store_id === storeId)) {
            const promise = logger.activity(`Creating default shipping profile for store ${storeId}...`)
            await shippingProfileService.createDefaultForStore(storeId)
            logger.success(promise, `Created default shipping profile for store ${storeId}!`)
        }
    }
}
