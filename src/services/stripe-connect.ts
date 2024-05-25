import { TransactionBaseService, type ConfigModule as MedusaConfigModule } from '@medusajs/medusa'
import { Lifetime } from 'awilix'
import { MedusaError } from 'medusa-core-utils'

import type StripeBase from 'medusa-payment-stripe/dist/core/stripe-base'
import type { Stripe } from 'stripe'
import type { Repository } from 'typeorm'

import type { Store } from '../models/store'

type ConfigModule = MedusaConfigModule & {
    projectConfig: MedusaConfigModule['projectConfig'] & {
        server_url: string
    }
}

type InjectedDependencies = {
    stripeProviderService: StripeBase
    storeRepository: Repository<Store>
    configModule: ConfigModule
}

class StripeConnectService extends TransactionBaseService {
    static identifier = 'stripe-connect'
    static LIFE_TIME = Lifetime.SINGLETON

    private readonly stripe_: Stripe
    private readonly serverUrl_: string
    private readonly storeRepository_: Repository<Store>

    constructor(container: InjectedDependencies) {
        super(container)

        this.stripe_ = container.stripeProviderService.getStripe()
        this.serverUrl_ = container.configModule.projectConfig.server_url

        this.storeRepository_ = container.storeRepository
    }

    async createTransfer(data: Stripe.TransferCreateParams): Promise<Stripe.Transfer> {
        const transfer = await this.stripe_.transfers.create(data)
        return transfer
    }

    async createAccount(storeId: string): Promise<Stripe.Response<Stripe.Account>> {
        return await this.atomicPhase_(async (m) => {
            const storeRepo = m.withRepository(this.storeRepository_)

            const store = await storeRepo.findOne({ where: { id: storeId } })

            if (!store) {
                throw new MedusaError(MedusaError.Types.NOT_FOUND, 'Store not found')
            }

            if (store.stripe_account_id) {
                return await this.stripe_.accounts.retrieve(store.stripe_account_id)
            }

            const accountToken = await this.stripe_.tokens.create({
                account: {
                    business_type: 'company',
                    company: {
                        name: store.name,
                    },
                    tos_shown_and_accepted: true,
                },
            })

            const account = await this.stripe_.accounts.create({
                type: 'custom',
                country: 'FR', // Replace with a supported country code, e.g. 'FR', 'US', 'ES' etc.
                account_token: accountToken.id,
                capabilities: {
                    card_payments: {
                        requested: true,
                    },
                    transfers: {
                        requested: true,
                    },
                },
            })


            await storeRepo.update(
                storeId,
                { stripe_account_id: account.id }
            )

            return account
        })
    }

    async createOnboardingLink(storeId: string) {
        const url = `${this.serverUrl_}/stripe/onboarding`

        return await this.atomicPhase_(async (m) => {
            const storeRepo = m.withRepository(this.storeRepository_)

            const store = await storeRepo.findOne({ where: { id: storeId } })

            if (!store) {
                throw new MedusaError(MedusaError.Types.NOT_FOUND, 'Store not found')
            }

            if (!store.stripe_account_id) {
                throw new MedusaError(MedusaError.Types.NOT_FOUND, 'Stripe account not found')
            }

            if (store.stripe_account_enabled) {
                throw new MedusaError(MedusaError.Types.NOT_ALLOWED, 'Stripe account already enabled')
            }

            const accountLink = await this.stripe_.accountLinks.create({
                account: store.stripe_account_id,
                type: 'account_onboarding',
                refresh_url: `${url}/refresh?storeId=${store.id}`,
                return_url: `${url}/return?storeId=${store.id}`,
            })


            if (!store.metadata) {
                store.metadata = {
                    stripe_onboarding_url: accountLink.url
                }
            } else {
                store.metadata.stripe_onboarding_url = accountLink.url
            }

            await storeRepo.save(store)
        })
    }


    async retrieveStripeAccount(storeId: string): Promise<Stripe.Account> {
        const stripeAccountId = (await this.storeRepository_.findOne({ where: { id: storeId } })).stripe_account_id
        const stripeAccount = await this.stripe_.accounts.retrieve(stripeAccountId)
        return stripeAccount
    }
}

export default StripeConnectService
