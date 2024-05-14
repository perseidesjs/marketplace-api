import type { Logger, SubscriberArgs, SubscriberConfig } from '@medusajs/medusa'

import ShippingProfileService from '../services/shipping-profile'
import StoreService from '../services/store'

export default async function handleStoreCreated({
    data,
    eventName,
    container,
    pluginOptions,
}: SubscriberArgs<Record<string, string>>) {
    
    const shippingProfileService = container.resolve<ShippingProfileService>("shippingProfileService")
    const logger = container.resolve<Logger>("logger")

    const promise = logger.activity(`Creating default shipping profile for store ${data.id}`)
    
    await shippingProfileService.createDefaultForStore(data.id).catch(e => {
        logger.failure(promise, `Error creating default shipping profile for store ${data.id}`)
        throw e
    })

    logger.success(promise, `Default shipping profile for store ${data.id} created`)
}

export const config: SubscriberConfig = {
    event: StoreService.Events.CREATED,
    context: {
        subscriberId: 'store-created-handler',
    },
}
