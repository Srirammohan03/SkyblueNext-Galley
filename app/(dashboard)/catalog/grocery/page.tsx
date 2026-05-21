// app/(dashboard)/catalog/grocery/page.tsx
"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import GroceryStock from "../../inventory/catalog/GroceryStock";
import GroceryOnboard from "./GroceryOnboard";

export default function GroceryPage() {
  return (
    <div className="p-4 sm:p-8">
      <Tabs defaultValue="stock" className="w-full">
        <TabsContent value="stock">
          <GroceryStock />
        </TabsContent>
      </Tabs>
    </div>
  );
}
