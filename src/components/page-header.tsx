import { Logo } from './logo';

export function PageHeader() {
  return (
    <header className="flex items-center space-x-3">
      <Logo className="h-8 w-8 text-primary" />
      <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        GWD Dashboard
      </h1>
    </header>
  );
}
