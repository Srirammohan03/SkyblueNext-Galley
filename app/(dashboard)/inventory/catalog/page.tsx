// app\(dashboard)\inventory\catalog\page.tsx


import { Tabs, TabsContent } from "@/components/ui/tabs";
import GroceryStock from "./GroceryStock";
export const dynamic = "force-dynamic";
export default function InventoryCatalogPage() {
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
