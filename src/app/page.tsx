'use client';

import { useState, useEffect } from 'react';
import type { SuggestImprovementsOutput } from '@/ai/flows/suggest-improvements';
import { suggestImprovements } from '@/ai/flows/suggest-improvements';
import { useToast } from '@/hooks/use-toast';
import { Sidebar, SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { ControlPanel } from '@/components/control-panel';

const initialCss = `/* Edit this CSS to style the canvas */
.canvas-content h1 {
  font-family: 'Inter', sans-serif;
  font-size: 3rem;
  font-weight: 700;
  color: #333;
  transition: color 0.3s ease;
}

.canvas-content p {
  color: #555;
  font-size: 1.125rem;
  max-width: 600px;
}

.canvas-content h1:hover {
  color: #D0B0F0;
}
`;

const initialJs = `// Edit this JavaScript to add interactivity
console.log('Welcome to the Tabula Rasa canvas!');

const header = document.querySelector('.canvas-content h1');
if(header) {
  header.addEventListener('click', () => {
    alert('You clicked the header!');
  });
}
`;

export default function Home() {
  const [cssCode, setCssCode] = useState(initialCss);
  const [jsCode, setJsCode] = useState(initialJs);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleGetSuggestions = async () => {
    setIsLoading(true);
    setSuggestions([]);
    try {
      const result: SuggestImprovementsOutput = await suggestImprovements({
        code: jsCode,
        uiComponents: cssCode,
      });
      setSuggestions(result.suggestions);
      if (result.suggestions.length === 0) {
        toast({
          title: 'All Good!',
          description: "No specific suggestions found. Your code looks great!",
        });
      }
    } catch (error) {
      console.error('Error getting suggestions:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not fetch suggestions at this time.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // This key-based approach ensures old scripts are removed before new ones are added.
    const scriptId = 'user-script';
    
    // Remove existing script
    const existingScript = document.getElementById(scriptId);
    if (existingScript) {
      existingScript.remove();
    }

    if (jsCode) {
      try {
        const script = document.createElement('script');
        script.id = scriptId;
        // Using a try-catch block inside the script to avoid breaking the app
        script.innerHTML = `try { ${jsCode} } catch (e) { console.error('Error in user script:', e); }`;
        document.body.appendChild(script);
      } catch (error) {
        console.error('Error executing user script:', error);
        toast({
          variant: 'destructive',
          title: 'Script Error',
          description: (error as Error).message,
        });
      }
    }
  }, [jsCode, toast]);

  return (
    <>
      <style>{cssCode}</style>
      <SidebarProvider>
        <Sidebar collapsible="icon" variant="sidebar">
          <ControlPanel
            cssCode={cssCode}
            setCssCode={setCssCode}
            jsCode={jsCode}
            setJsCode={setJsCode}
            suggestions={suggestions}
            isLoading={isLoading}
            handleGetSuggestions={handleGetSuggestions}
          />
        </Sidebar>
        <SidebarInset>
          <main className="flex-1 p-8 bg-background">
            <div className="canvas-content">
              <h1 className="font-headline">Welcome to Tabula Rasa</h1>
              <p>
                This is your canvas. Use the panel to inject CSS and JavaScript,
                get AI-powered suggestions, and export your creation.
              </p>
            </div>
          </main>
        </SidebarInset>
      </SidebarProvider>
    </>
  );
}
