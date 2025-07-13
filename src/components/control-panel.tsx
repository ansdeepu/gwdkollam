
'use client';

import * as React from 'react';
import {
  Wand2,
  Download,
  Loader2,
  Lightbulb,
  FileJson,
  FileCode,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface ControlPanelProps {
  cssCode: string;
  setCssCode: (value: string) => void;
  jsCode: string;
  setJsCode: (value: string) => void;
  suggestions: string[];
  isLoading: boolean;
  handleGetSuggestions: () => void;
}

export function ControlPanel({
  cssCode,
  setCssCode,
  jsCode,
  setJsCode,
  suggestions,
  isLoading,
  handleGetSuggestions,
}: ControlPanelProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="p-4">
        <h2 className="text-xl font-bold font-headline">Tabula Rasa</h2>
        <p className="text-sm text-muted-foreground">Your creative canvas.</p>
      </div>
      <Separator />

      <ScrollArea className="flex-grow">
        <div className="p-4 space-y-6">
          <Tabs defaultValue="css" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="css">CSS</TabsTrigger>
              <TabsTrigger value="javascript">JavaScript</TabsTrigger>
            </TabsList>
            <TabsContent value="css">
              <Textarea
                placeholder="Type your CSS here..."
                value={cssCode}
                onChange={(e) => setCssCode(e.target.value)}
                className="font-code h-48 resize-y"
              />
            </TabsContent>
            <TabsContent value="javascript">
              <Textarea
                placeholder="Type your JavaScript here..."
                value={jsCode}
                onChange={(e) => setJsCode(e.target.value)}
                className="font-code h-48 resize-y"
              />
            </TabsContent>
          </Tabs>

          <div>
            <Button
              onClick={handleGetSuggestions}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Wand2 />
              )}
              Smart Suggestion Assistant
            </Button>
          </div>

          {isLoading && (
            <div className="flex items-center justify-center text-sm text-muted-foreground space-x-2 pt-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Analyzing code...</span>
            </div>
          )}

          {!isLoading && suggestions.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Lightbulb className="text-amber-400" />
                  <span>Suggestions</span>
                </CardTitle>
                <CardDescription>
                  AI-powered ideas to improve your code.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {suggestions.map((suggestion, index) => (
                    <li
                      key={index}
                      className="text-sm flex items-start gap-3"
                    >
                      <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2" />
                      <span>{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      </ScrollArea>

      <Separator />
      <div className="p-4">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" className="w-full">
              <Download />
              Export Project
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <Info />
                Export Functionality
              </AlertDialogTitle>
              <AlertDialogDescription>
                This feature would package your current creation into a
                downloadable Next.js project.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="text-sm space-y-4">
              <p>
                The exported project would include:
              </p>
              <ul className="space-y-2 list-none">
                <li className="flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-primary" />
                  <span>Your custom CSS and JavaScript files.</span>
                </li>
                <li className="flex items-center gap-2">
                  <FileJson className="w-4 h-4 text-primary" />
                  <span>A `package.json` with all necessary dependencies.</span>
                </li>
              </ul>
              <p>
                This would provide a complete, ready-to-deploy starter kit for
                further local development.
              </p>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction>Understood</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
