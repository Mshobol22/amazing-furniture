"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Lock, CreditCard } from "lucide-react";
import { useCartStore, useCartItemCount, useCartTotal, getEffectivePrice } from "@/store/cartStore";
import { Button } from "@/components/ui/button";
import { ProductImage } from "@/components/ui/ProductImage";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

const SHIPPING_THRESHOLD = 299;
const SHIPPING_COST = 29;

const shippingSchema = z.object({
  fullName: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required"),
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  zipCode: z.string().min(1, "ZIP code is required"),
  country: z.string().min(1, "Country is required"),
});

type ShippingFormData = z.infer<typeof shippingSchema>;

const categoryLabel = (cat: string) =>
  cat.charAt(0).toUpperCase() + cat.slice(1).replace("-", " ");

const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      color: "#1C1C1C",
      fontFamily: "DM Sans, sans-serif",
      fontSize: "16px",
      "::placeholder": { color: "#6B6560" },
    },
    invalid: {
      color: "#dc2626",
    },
  },
};

function CheckoutForm() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [shippingData, setShippingData] = useState<ShippingFormData | null>(
    null
  );
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const items = useCartStore((state) => state.items);
  const clearCart = useCartStore((state) => state.clearCart);
  const subtotal = useCartTotal();
  const shipping = subtotal >= SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;
  const total = subtotal + shipping;

  const stripe = useStripe();
  const elements = useElements();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ShippingFormData>({
    resolver: zodResolver(shippingSchema),
    defaultValues: { country: "US" },
  });

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        const name =
          user.user_metadata?.full_name ??
          user.user_metadata?.name ??
          "";
        reset({
          fullName: name,
          email: user.email ?? "",
          address: "",
          city: "",
          state: "",
          zipCode: "",
          country: "US",
        });
      }
    });
  }, [reset]);

  const onShippingSubmit = (data: ShippingFormData) => {
    setShippingData(data);
    setStep(2);
  };

  const onPaymentSubmit = async () => {
    if (!stripe || !elements || !shippingData) return;

    setPaymentError(null);
    setIsProcessing(true);

    try {
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        setPaymentError("Card element not found");
        setIsProcessing(false);
        return;
      }

      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items,
          shippingAddress: {
            name: shippingData.fullName,
            email: shippingData.email,
            address: shippingData.address,
            city: shippingData.city,
            state: shippingData.state,
            zip: shippingData.zipCode,
            country: shippingData.country,
          },
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setPaymentError(data.error || "Failed to create payment");
        setIsProcessing(false);
        return;
      }

      const { error } = await stripe.confirmCardPayment(data.clientSecret, {
        payment_method: { card: cardElement },
      });

      if (error) {
        setPaymentError(error.message || "Payment failed");
        setIsProcessing(false);
        return;
      }

      setStep(3);
    } catch (err) {
      setPaymentError("An unexpected error occurred");
      setIsProcessing(false);
    }
  };

  const onContinueShopping = () => {
    clearCart();
    router.push("/products");
  };

  if (items.length === 0 && step < 3) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-6 px-4 py-16">
        <p className="text-charcoal">Your cart is empty.</p>
        <Button asChild className="bg-walnut text-cream hover:bg-walnut/90">
          <Link href="/products">Shop Products</Link>
        </Button>
      </div>
    );
  }

  const steps = [1, 2, 3];
  const stepLabels = ["Shipping", "Payment", "Confirmation"];

  return (
    <div className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        {/* Progress indicator */}
        <div className="mb-12 flex items-center justify-between">
          {steps.map((s, i) => (
            <div key={s} className="flex flex-1 items-center">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full font-medium ${
                  step >= s
                    ? "bg-walnut text-cream"
                    : "bg-light-sand text-warm-gray"
                }`}
              >
                {step > s ? <Check className="h-5 w-5" /> : s}
              </div>
              <span
                className={`ml-2 hidden text-sm sm:inline ${
                  step >= s ? "text-charcoal" : "text-warm-gray"
                }`}
              >
                {stepLabels[i]}
              </span>
              {i < steps.length - 1 && (
                <div
                  className={`mx-4 flex-1 border-t-2 ${
                    step > s ? "border-walnut" : "border-light-sand"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="rounded-lg border border-light-sand bg-cream p-6"
            >
              <h2 className="mb-6 font-display text-2xl font-semibold text-charcoal">
                Shipping Information
              </h2>
              <form
                onSubmit={handleSubmit(onShippingSubmit)}
                className="space-y-4"
              >
                <div>
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    {...register("fullName")}
                    className="mt-1"
                  />
                  {errors.fullName && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.fullName.message}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    {...register("email")}
                    className="mt-1"
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.email.message}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    {...register("address")}
                    className="mt-1"
                  />
                  {errors.address && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.address.message}
                    </p>
                  )}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="city">City</Label>
                    <Input id="city" {...register("city")} className="mt-1" />
                    {errors.city && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.city.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      {...register("state")}
                      className="mt-1"
                    />
                    {errors.state && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.state.message}
                      </p>
                    )}
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="zipCode">ZIP Code</Label>
                    <Input
                      id="zipCode"
                      {...register("zipCode")}
                      className="mt-1"
                    />
                    {errors.zipCode && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.zipCode.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="country">Country</Label>
                    <Input
                      id="country"
                      {...register("country")}
                      className="mt-1"
                    />
                    {errors.country && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.country.message}
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full bg-walnut text-cream hover:bg-walnut/90"
                >
                  Continue to Payment
                </Button>
              </form>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              <div className="rounded-lg border border-light-sand bg-cream p-6">
                <h2 className="mb-4 font-display text-2xl font-semibold text-charcoal">
                  Order Summary
                </h2>
                <div className="max-h-48 space-y-2 overflow-y-auto">
                  {items.map((item) => (
                    <div
                      key={item.product.id}
                      className="flex gap-3 text-sm"
                    >
                      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded bg-gray-50 p-0.5">
                        <ProductImage
                          src={item.product.images[0]}
                          alt={item.product.name}
                          fill
                          className="object-contain"
                          sizes="48px"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{item.product.name}</p>
                        <p className="text-warm-gray">
                          {item.quantity} × $
                          {getEffectivePrice(item.product).toLocaleString()}
                        </p>
                      </div>
                      <p className="font-medium">
                        $
                        {(
                          getEffectivePrice(item.product) * item.quantity
                        ).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 space-y-1 border-t pt-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-warm-gray">Subtotal</span>
                    <span>${subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-warm-gray">Shipping</span>
                    <span>
                      {shipping === 0 ? "FREE" : `$${shipping.toFixed(2)}`}
                    </span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>Total</span>
                    <span>${total.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-light-sand bg-cream p-6">
                <h2 className="mb-4 font-display text-2xl font-semibold text-charcoal">
                  Payment
                </h2>
                <div className="rounded-md border border-warm-gray/30 bg-white p-4">
                  <CardElement options={CARD_ELEMENT_OPTIONS} />
                </div>
                {paymentError && (
                  <p className="mt-2 text-sm text-red-600">{paymentError}</p>
                )}
                <div className="mt-4 flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(1)}
                  >
                    Back
                  </Button>
                  <Button
                    onClick={onPaymentSubmit}
                    disabled={!stripe || isProcessing}
                    className="flex-1 bg-walnut text-cream hover:bg-walnut/90"
                  >
                    {isProcessing ? "Processing..." : `Pay $${total.toFixed(2)}`}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-lg border border-light-sand bg-cream p-8 text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100"
              >
                <Check className="h-10 w-10 text-green-600" />
              </motion.div>
              <h2 className="mb-2 font-display text-3xl font-semibold text-charcoal">
                Order Confirmed!
              </h2>
              <p className="mb-8 text-warm-gray">
                Thank you {shippingData?.fullName}, your order is on its way.
              </p>
              <div className="mb-8 rounded-lg border border-light-sand p-4 text-left">
                <h3 className="mb-4 font-medium">Order Summary</h3>
                {items.map((item) => (
                  <div
                    key={item.product.id}
                    className="flex justify-between text-sm"
                  >
                    <span>
                      {item.product.name} × {item.quantity}
                    </span>
                    <span>
                      $
                      {(
                        getEffectivePrice(item.product) * item.quantity
                      ).toLocaleString()}
                    </span>
                  </div>
                ))}
                <div className="mt-2 border-t pt-2 font-semibold">
                  Total: ${total.toLocaleString()}
                </div>
              </div>
              <Button
                onClick={onContinueShopping}
                className="w-full bg-walnut text-cream hover:bg-walnut/90"
              >
                Continue Shopping
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  const itemCount = useCartItemCount();

  if (itemCount === 0) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-6 px-4 py-16">
        <p className="text-charcoal">Your cart is empty.</p>
        <Button asChild className="bg-walnut text-cream hover:bg-walnut/90">
          <Link href="/products">Shop Products</Link>
        </Button>
      </div>
    );
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{
        appearance: {
          theme: "stripe",
          variables: {
            colorPrimary: "#8B6914",
            colorBackground: "#FAF8F5",
            colorText: "#1C1C1C",
            colorDanger: "#dc2626",
          },
        },
      }}
    >
      <CheckoutForm />
    </Elements>
  );
}
