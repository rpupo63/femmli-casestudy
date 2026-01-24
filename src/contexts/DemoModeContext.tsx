import { createContext, useContext, useState, ReactNode } from 'react';

interface DemoModeContextType {
    useDemoData: boolean;
    setUseDemoData: (value: boolean) => void;
}

const DemoModeContext = createContext<DemoModeContextType | undefined>(undefined);

export function DemoModeProvider({ children }: { children: ReactNode }) {
    const [useDemoData, setUseDemoData] = useState(true);

    return (
        <DemoModeContext.Provider value={{ useDemoData, setUseDemoData }}>
            {children}
        </DemoModeContext.Provider>
    );
}

export function useDemoMode() {
    const context = useContext(DemoModeContext);
    if (context === undefined) {
        throw new Error('useDemoMode must be used within a DemoModeProvider');
    }
    return context;
}
