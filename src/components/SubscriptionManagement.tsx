'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  CreditCard,
  Calendar,
  CheckCircle,
  XCircle,
  AlertCircle,
  PauseCircle,
  Loader2,
  ExternalLink,
  RefreshCw
} from 'lucide-react'

interface SubscriptionDetails {
  hasSubscription: boolean
  subscription?: {
    id: string
    status: string
    currentPeriodEnd: number
    currentPeriodStart: number
    cancelAtPeriodEnd: boolean
    cancelAt: number | null
    canceledAt: number | null
    paymentMethod: {
      type: string
      last4: string | null
      brand: string | null
      sepa_last4: string | null
    } | null
    priceAmount: number
    priceCurrency: string
    createdAt: number
  }
  formatted?: {
    nextBillingDate: string | null
    startDate: string | null
    cancelAtDate: string | null
    canceledAtDate: string | null
    amount: string
  }
  databaseInfo?: {
    planType: string
    status: string
    subscriptionStatus: string
    accessStartsAt: string
  }
  stripeError?: string
  message?: string
}

interface SubscriptionManagementProps {
  userId: string
  onRefresh?: () => void
}

export default function SubscriptionManagement({ userId, onRefresh }: SubscriptionManagementProps) {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [subscriptionDetails, setSubscriptionDetails] = useState<SubscriptionDetails | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [managingPortal, setManagingPortal] = useState(false)

  const fetchSubscriptionDetails = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      setError(null)

      const response = await fetch('/api/subscription/details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })

      if (!response.ok) {
        throw new Error('Failed to fetch subscription details')
      }

      const data = await response.json()
      setSubscriptionDetails(data)
    } catch (err: any) {
      console.error('Error fetching subscription:', err)
      setError(err.message || 'Fehler beim Laden der Abo-Daten')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    if (userId) {
      fetchSubscriptionDetails()
    }
  }, [userId])

  const handleManageSubscription = async () => {
    try {
      setManagingPortal(true)
      const response = await fetch('/api/stripe/customer-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })

      if (!response.ok) {
        throw new Error('Failed to open customer portal')
      }

      const { url } = await response.json()
      if (url) {
        window.open(url, '_blank')
      }
    } catch (err: any) {
      console.error('Error opening portal:', err)
      setError('Fehler beim Öffnen des Verwaltungsportals')
    } finally {
      setManagingPortal(false)
    }
  }

  const handleRefresh = () => {
    fetchSubscriptionDetails(true)
    if (onRefresh) {
      onRefresh()
    }
  }

  const getStatusInfo = (status: string, cancelAtPeriodEnd: boolean) => {
    if (cancelAtPeriodEnd) {
      return {
        label: 'Wird gekündigt',
        color: 'bg-orange-100 text-orange-800 border-orange-200',
        icon: AlertCircle,
        iconColor: 'text-orange-600'
      }
    }

    switch (status) {
      case 'active':
        return {
          label: 'Aktiv',
          color: 'bg-green-100 text-green-800 border-green-200',
          icon: CheckCircle,
          iconColor: 'text-green-600'
        }
      case 'past_due':
        return {
          label: 'Zahlung ausstehend',
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          icon: AlertCircle,
          iconColor: 'text-yellow-600'
        }
      case 'canceled':
        return {
          label: 'Gekündigt',
          color: 'bg-red-100 text-red-800 border-red-200',
          icon: XCircle,
          iconColor: 'text-red-600'
        }
      case 'paused':
        return {
          label: 'Pausiert',
          color: 'bg-blue-100 text-blue-800 border-blue-200',
          icon: PauseCircle,
          iconColor: 'text-blue-600'
        }
      default:
        return {
          label: status,
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: AlertCircle,
          iconColor: 'text-gray-600'
        }
    }
  }

  const getPaymentMethodDisplay = (paymentMethod: any) => {
    if (!paymentMethod) return 'Nicht verfügbar'

    if (paymentMethod.type === 'card' && paymentMethod.last4) {
      const brand = paymentMethod.brand ? paymentMethod.brand.charAt(0).toUpperCase() + paymentMethod.brand.slice(1) : 'Karte'
      return `•••• ${paymentMethod.last4} (${brand})`
    }

    if (paymentMethod.type === 'sepa_debit' && paymentMethod.sepa_last4) {
      return `SEPA •••• ${paymentMethod.sepa_last4}`
    }

    if (paymentMethod.type === 'paypal') {
      return 'PayPal'
    }

    return paymentMethod.type
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
      </div>
    )
  }

  if (error && !subscriptionDetails) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <XCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="font-medium text-red-900 mb-1">Fehler beim Laden</h3>
            <p className="text-sm text-red-700">{error}</p>
            <button
              onClick={() => fetchSubscriptionDetails()}
              className="mt-3 text-sm text-red-700 hover:text-red-800 underline"
            >
              Erneut versuchen
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!subscriptionDetails?.hasSubscription) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="font-medium text-amber-900 mb-1">Kein aktives Abo</h3>
            <p className="text-sm text-amber-700 mb-3">
              {subscriptionDetails?.message || 'Du hast derzeit kein aktives Abonnement.'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  const { subscription, formatted, databaseInfo, stripeError } = subscriptionDetails

  if (!subscription) {
    // Fallback to database info if Stripe data unavailable
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border border-amber-200 rounded-xl p-6 shadow-sm"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-light text-amber-900">Abo-Verwaltung</h3>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 hover:bg-amber-50 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 text-amber-600 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {stripeError && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-yellow-800">{stripeError}</p>
          </div>
        )}

        {databaseInfo && (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-amber-600 mb-1">Status</p>
              <p className="text-base text-amber-900 font-medium">
                {databaseInfo.subscriptionStatus === 'active' ? 'Aktiv' : databaseInfo.subscriptionStatus}
              </p>
            </div>

            <div>
              <p className="text-sm text-amber-600 mb-1">Plan</p>
              <p className="text-base text-amber-900">{databaseInfo.planType}</p>
            </div>

            <button
              onClick={handleManageSubscription}
              disabled={managingPortal}
              className="w-full mt-6 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg hover:from-amber-600 hover:to-orange-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {managingPortal ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Wird geöffnet...
                </>
              ) : (
                <>
                  Abo verwalten
                  <ExternalLink className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        )}
      </motion.div>
    )
  }

  const statusInfo = getStatusInfo(subscription.status, subscription.cancelAtPeriodEnd)
  const StatusIcon = statusInfo.icon

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-amber-200 rounded-xl shadow-sm overflow-hidden"
    >
      {/* Header */}
      <div className="p-6 border-b border-amber-100">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-light text-amber-900">Abo-Verwaltung</h3>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 hover:bg-amber-50 rounded-lg transition-colors disabled:opacity-50"
            title="Aktualisieren"
          >
            <RefreshCw className={`w-5 h-5 text-amber-600 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Status Badge */}
      <div className="px-6 pt-6">
        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border ${statusInfo.color}`}>
          <StatusIcon className={`w-4 h-4 ${statusInfo.iconColor}`} />
          <span className="text-sm font-medium">{statusInfo.label}</span>
        </div>
      </div>

      {/* Subscription Details */}
      <div className="p-6 space-y-5">
        {/* Plan Info */}
        <div className="flex items-start gap-3">
          <CreditCard className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-amber-600 mb-0.5">Plan</p>
            <p className="text-base text-amber-900 font-medium">
              Monatliches Abo ({formatted?.amount || `${subscription.priceAmount} €`}/Monat)
            </p>
          </div>
        </div>

        {/* Next Billing Date */}
        {subscription.status === 'active' && !subscription.cancelAtPeriodEnd && formatted?.nextBillingDate && (
          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-amber-600 mb-0.5">Nächste Abrechnung</p>
              <p className="text-base text-amber-900">{formatted.nextBillingDate}</p>
            </div>
          </div>
        )}

        {/* Cancellation Info */}
        {subscription.cancelAtPeriodEnd && formatted?.cancelAtDate && (
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-orange-600 mb-0.5">Abo endet am</p>
              <p className="text-base text-orange-900">{formatted.cancelAtDate}</p>
              <p className="text-sm text-orange-700 mt-1">
                Du kannst das Abo bis dahin weiterhin nutzen. Du kannst die Kündigung im Verwaltungsportal widerrufen.
              </p>
            </div>
          </div>
        )}

        {/* Canceled Info */}
        {subscription.status === 'canceled' && formatted?.canceledAtDate && (
          <div className="flex items-start gap-3">
            <XCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-red-600 mb-0.5">Gekündigt am</p>
              <p className="text-base text-red-900">{formatted.canceledAtDate}</p>
            </div>
          </div>
        )}

        {/* Past Due Warning */}
        {subscription.status === 'past_due' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-900 mb-1">Zahlung fehlgeschlagen</p>
                <p className="text-sm text-yellow-800">
                  Deine letzte Zahlung ist fehlgeschlagen. Bitte aktualisiere deine Zahlungsmethode im Verwaltungsportal.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Payment Method */}
        {subscription.paymentMethod && (
          <div className="flex items-start gap-3">
            <CreditCard className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-amber-600 mb-0.5">Zahlungsmethode</p>
              <p className="text-base text-amber-900">
                {getPaymentMethodDisplay(subscription.paymentMethod)}
              </p>
            </div>
          </div>
        )}

        {/* Start Date */}
        {formatted?.startDate && (
          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-amber-600 mb-0.5">Abo gestartet am</p>
              <p className="text-base text-amber-900">{formatted.startDate}</p>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-6 pb-6 pt-2">
        <button
          onClick={handleManageSubscription}
          disabled={managingPortal}
          className="w-full px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg hover:from-amber-600 hover:to-orange-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
        >
          {managingPortal ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Wird geöffnet...
            </>
          ) : (
            <>
              Abo verwalten
              <ExternalLink className="w-4 h-4" />
            </>
          )}
        </button>
        <p className="text-xs text-amber-600 text-center mt-3">
          Im Verwaltungsportal kannst du deine Zahlungsmethode ändern, Rechnungen herunterladen und dein Abo kündigen.
        </p>
      </div>

      {error && (
        <div className="px-6 pb-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}
    </motion.div>
  )
}
