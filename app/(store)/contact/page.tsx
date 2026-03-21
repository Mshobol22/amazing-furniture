"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

type ContactFormData = {
  name: string;
  email: string;
  subject: string;
  message: string;
};

export default function ContactPage() {
  const { toast } = useToast();
  const { register, handleSubmit, reset } = useForm<ContactFormData>();

  const onSubmit = () => {
    toast({
      title: "Thanks!",
      description: "We'll get back to you within 1 business day.",
    });
    reset();
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <nav className="mb-8 flex items-center gap-2 text-sm text-warm-gray">
          <Link href="/" className="hover:text-charcoal">
            Home
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-charcoal">Contact</span>
        </nav>

        <h1 className="mb-8 font-display text-3xl font-semibold text-charcoal">
          Contact Us
        </h1>

        <div className="grid gap-12 lg:grid-cols-2">
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="mb-4 font-display text-lg font-semibold text-charcoal">
              Amazing Home Furniture
            </h2>
            <p className="text-sm text-warm-gray">
              support@amazinghomefurniture.com
            </p>
            <p className="mt-1 text-sm text-warm-gray">
              <a href="tel:+17086255757" className="hover:text-charcoal hover:underline">
                +1 (708) 625-5757
              </a>
            </p>
            <p className="mt-1 text-sm text-warm-gray">
              <a
                href="https://www.google.com/maps/search/?api=1&query=6639+N+Clark+St,+Chicago,+IL+60626"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-charcoal hover:underline"
              >
                6639 N Clark St, Chicago, IL 60626
              </a>
            </p>
            <p className="mt-2 text-sm">
              <a
                href="https://www.google.com/maps/dir/?api=1&destination=6639+N+Clark+St,+Chicago,+IL+60626"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-[#2D4A3E] hover:underline"
              >
                Get Directions
              </a>
            </p>
            <div className="mt-6">
              <h3 className="text-sm font-medium text-charcoal">Hours</h3>
              <p className="mt-1 text-sm text-warm-gray">
                Mon–Fri: 9am–6pm CST
              </p>
              <p className="text-sm text-warm-gray">Sat: 10am–4pm CST</p>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="mb-4 font-display text-lg font-semibold text-charcoal">
              Send us a message
            </h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  {...register("name", { required: true })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  {...register("email", { required: true })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  {...register("subject", { required: true })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="message">Message</Label>
                <textarea
                  id="message"
                  {...register("message", { required: true })}
                  rows={4}
                  className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
                />
              </div>
              <Button type="submit" className="bg-walnut text-cream hover:bg-walnut/90">
                Send Message
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
