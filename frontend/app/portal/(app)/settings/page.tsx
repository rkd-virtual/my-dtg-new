// server component (no "use client" here)
import { SiteHeader } from "@/components/site-header";
import SitesList from "./_components/SitesList"; // client component
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";

export default function SettingsPage() {
  return (
    <>
      <SiteHeader title="Settings" />
      <div className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
            <p className="text-muted-foreground">
              Manage your account settings and preferences
            </p>
          </div>
        </div>

        <Tabs defaultValue="account" className="w-full">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto">
            <TabsTrigger value="account">Account</TabsTrigger>
            <TabsTrigger value="sites">Amazon Sites</TabsTrigger>
          </TabsList>

          <TabsContent value="account" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Personal Information</CardTitle>
                <CardDescription>
                  Update your account details and personal information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input id="firstName" defaultValue="John" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input id="lastName" defaultValue="Doe" />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" defaultValue="customer@example.com" disabled />
                </div>
                {/* <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" type="tel" defaultValue="+1 (555) 123-4567" />
                </div> */}
                <div className="space-y-2">
                  <Label htmlFor="job_title">Other Accounts</Label>
                  <Input id="job_title" type="text" />
                </div>
                </div>
              </CardContent>
              <CardFooter>
                {/* no onClick in server component */}
                <Button>Save Changes</Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Password</CardTitle>
                <CardDescription>
                  Change your password to keep your account secure
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <Input id="currentPassword" type="password" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input id="newPassword" type="password" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input id="confirmPassword" type="password" />
                </div>
              </CardContent>
              <CardFooter>
                <Button>Update Password</Button>
              </CardFooter>
            </Card>
            
            {/* Shipping information card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Shipping information</CardTitle>
              <CardDescription>
                Provide the default shipping address and account used for fulfillment.
              </CardDescription>
            </CardHeader>

                
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">  
                {/* Select Account */}
                <div>
                  <Label htmlFor="siteAccount" className="mb-2">Select an Account</Label>
                  <select
                    id="siteAccount"
                    className="w-full rounded border px-3 py-2 text-sm"
                    defaultValue="DEN2"
                  >
                    <option value="DEN2">Amazon DEN2</option>
                    <option value="ABQ5">Amazon ABQ5</option>
                    <option value="JFK8">Amazon JFK8</option>
                  </select>
                </div>

                {/* Address Line 1 */}
                <div>
                  <Label htmlFor="addr1" className="mb-2">Address Line 1</Label>
                  <Input id="addr1" defaultValue="564 infinity drive" />
                </div>
              </div>
              
              
              {/* City / State / ZIP in one row */}
              {/* <div className="grid grid-cols-1 gap-3 sm:grid-cols-12"></div> */}
              <div className="grid gap-4 sm:grid-cols-2"> 
                  <div>
                    <Label htmlFor="city" className="mb-2">City</Label>
                    <Input id="city" defaultValue="Denver" />
                  </div>

                  <div>
                    <Label htmlFor="state" className="mb-2">State / Province</Label>
                    <Input id="state" defaultValue="Colorado" />
                  </div>
                </div>

               <div className="grid gap-4 sm:grid-cols-2">  
                <div>
                  <Label htmlFor="zip" className="mb-2">ZIP / Postal code</Label>
                  <Input id="zip" defaultValue="80237" />
                </div>
              

              {/* Country */}
              <div>
                <Label htmlFor="country" className="mb-2">Country</Label>
                <Input id="country" defaultValue="US" />
              </div>

              </div> 

              {/* Helpful hint row (small green text like your screenshot) */}
              {/* <div className="text-sm text-green-600">✓ ZIP matches city and state</div> */}
            </CardContent>

            <CardFooter className="flex items-center justify-between gap-4">              
                <Button>Save Changes</Button>              
            </CardFooter>
          </Card>


          </TabsContent>

          <TabsContent value="sites" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Amazon Sites</CardTitle>
                <CardDescription>Manage your Amazon fulfillment center sites</CardDescription>
              </CardHeader>
              <CardContent>
                {/* client component contains the interactive Add/Edit/Delete buttons */}
                <SitesList />
              </CardContent>
              <CardFooter>
                {/* server-side button must not include event handlers */}
                {/* <Button>Add New Site</Button> */}
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
