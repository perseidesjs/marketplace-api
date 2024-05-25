import type { Logger, MedusaContainer, SubscriberArgs, SubscriberConfig } from '@medusajs/medusa'
import type { EntityManager } from 'typeorm'

import type ShippingProfileService from '../services/shipping-profile'
import type StripeConnectService from '../services/stripe-connect'
import StoreService from '../services/store'


export default async function handleStoreCreated({
    data,
    eventName,
    container,
    pluginOptions,
}: SubscriberArgs<Record<string, string>>) {
    const logger = container.resolve<Logger>("logger")

    const shippingProfileActivity = logger.activity(`Creating default shipping profile for store ${data.id}`)
    await createDefaultShippingProfile(data.id, container).catch(e => {
        logger.failure(shippingProfileActivity, `Error creating default shipping profile for store ${data.id}`)
        throw e
    })
    logger.success(shippingProfileActivity, `Default shipping profile for store ${data.id} created`)

    const stripeAccountActivity = logger.activity(`Creating stripe account for store ${data.id}`)
    await createStripeAccount(data.id, container).catch(e => {
        logger.failure(stripeAccountActivity, `Error creating stripe account for store ${data.id}`)
        throw e
    })

    logger.success(stripeAccountActivity, `Stripe account for store ${data.id} created`)

    const stripeOnboardingActivity = logger.activity(`Creating stripe onboarding link for store ${data.id}`)
    await createStripeOnboardingLink(data.id, container).catch(e => {
        logger.failure(stripeOnboardingActivity, `Error creating stripe onboarding link for store ${data.id}`)
        throw e
    })
    logger.success(stripeOnboardingActivity, `Stripe onboarding link for store ${data.id} created`)

}


async function createDefaultShippingProfile(storeId: string, container: MedusaContainer) {
    const manager = container.resolve<EntityManager>("manager")
    const shippingProfileService = container.resolve<ShippingProfileService>("shippingProfileService")
    return await manager.transaction(async (m) => {
        await shippingProfileService.withTransaction(m).createDefaultForStore(storeId)
    })
}

async function createStripeAccount(storeId: string, container: MedusaContainer) {
    const manager = container.resolve<EntityManager>("manager")
    const stripeConnectService = container.resolve<StripeConnectService>("stripeConnectService")
    return await manager.transaction(async (m) => {
        await stripeConnectService.withTransaction(m).createAccount(storeId)
    })
}

async function createStripeOnboardingLink(storeId: string, container: MedusaContainer) {
    const manager = container.resolve<EntityManager>("manager")
    const stripeConnectService = container.resolve<StripeConnectService>("stripeConnectService")
    return await manager.transaction(async (m) => {
        await stripeConnectService.withTransaction(m).createOnboardingLink(storeId)
    })
}

export const config: SubscriberConfig = {
    event: StoreService.Events.CREATED,
    context: {
        subscriberId: 'store-created-handler',
    },
}
