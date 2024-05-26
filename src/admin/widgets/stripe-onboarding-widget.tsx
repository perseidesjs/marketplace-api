import type { WidgetConfig } from "@medusajs/admin"
import type { SVGProps } from 'react'

import { useAdminStore, useLocalStorage } from 'medusa-react'

const StripeOnboardingWidget = () => {

    const { store } = useAdminStore()

    const [shouldHideMessage, setHideMessage] = useLocalStorage("dismiss_stripe_message", "false")

    if (!store || !store.metadata || !store.metadata.stripe_onboarding_url) return null

    if (store.stripe_account_enabled && shouldHideMessage === "false"){
        return <AccountActivatedDisplay hideMessage={() => setHideMessage("true")} />
    }

    if (!store.stripe_account_enabled) {
        return <ActivateAccountDisplay link={store.metadata.stripe_onboarding_url as string} />
    }

    return null
}


const ActivateAccountDisplay = ({ link }: { link: string }) => {
    return (
        <div className="bg-white/60 backdrop-blur-sm border-b-2 py-6 px-32 min-h-[10rem] fixed top-0 right-0 w-full flex items-center justify-between max-w-[calc(100%-240px)]">
            <div className="flex items-center gap-4">
                <WarningIcon className="text-amber-500" />
                <div className="space-1.5">
                    <h1 className="font-medium text-lg tracking-tight text-grey-80">Activate your Stripe Account</h1>
                    <p className="text-sm text-grey-50">
                        Activate your account to start selling your products and make a profit on the perseides platform.
                    </p>
                </div>
            </div>
            <a href={link} className="px-4 h-9 bg-grey-90 text-white rounded flex items-center text-sm font-medium hover:bg-grey-70 transition-colors duration-300">
                Activate Now
            </a>
        </div>
    )
}


const AccountActivatedDisplay = ({ hideMessage }: { hideMessage: () => void }) => {
    return (
        <div className="bg-white/60 backdrop-blur-sm border-b-2 py-6 px-32 min-h-[10rem] fixed top-0 right-0 w-full flex items-center justify-between max-w-[calc(100%-240px)]">
            <div className="flex items-center gap-4">
                <CheckIcon className="text-green-500" />
                <div className="space-1.5">
                    <h1 className="font-medium text-lg tracking-tight text-grey-80">Your account has been activated</h1>
                    <p className="text-sm text-grey-50">
                        Welcome to perseides, your products are now visible on the storefront and available to buy!
                    </p>
                </div>
            </div>
            <button onClick={hideMessage} className="px-4 h-9 bg-grey-90 text-white rounded flex items-center text-sm font-medium hover:bg-grey-70 transition-colors duration-300">
                Dismiss
            </button>
        </div>
    )
}

const WarningIcon = (props: SVGProps<SVGSVGElement>) => (<svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
>
    <path
        d="M12 6C12.5523 6 13 6.44772 13 7V13C13 13.5523 12.5523 14 12 14C11.4477 14 11 13.5523 11 13V7C11 6.44772 11.4477 6 12 6Z"
        fill="currentColor"
    />
    <path
        d="M12 16C11.4477 16 11 16.4477 11 17C11 17.5523 11.4477 18 12 18C12.5523 18 13 17.5523 13 17C13 16.4477 12.5523 16 12 16Z"
        fill="currentColor"
    />
    <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2ZM4 12C4 16.4183 7.58172 20 12 20C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4C7.58172 4 4 7.58172 4 12Z"
        fill="currentColor"
    />
</svg>)

const CheckIcon = (props: SVGProps<SVGSVGElement>) => (<svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
>
    <path
        d="M10.2426 16.3137L6 12.071L7.41421 10.6568L10.2426 13.4853L15.8995 7.8284L17.3137 9.24262L10.2426 16.3137Z"
        fill="currentColor"
    />
    <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M1 12C1 5.92487 5.92487 1 12 1C18.0751 1 23 5.92487 23 12C23 18.0751 18.0751 23 12 23C5.92487 23 1 18.0751 1 12ZM12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12C21 16.9706 16.9706 21 12 21Z"
        fill="currentColor"
    />
</svg>)

export const config: WidgetConfig = {
    zone: ["order.list.before", "product.list.before"],
}

export default StripeOnboardingWidget