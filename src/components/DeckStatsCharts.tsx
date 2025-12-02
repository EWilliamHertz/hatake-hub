import { Card } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

interface DeckCard {
  id: string;
  name: string;
  cmc?: number;
  mana_cost?: string;
  colors?: string[];
  quantity: number;
}

interface DeckStatsChartsProps {
  mainDeck: DeckCard[];
  commander?: DeckCard | null;
}

// MTG color mapping
const COLOR_MAP: Record<string, { name: string; color: string }> = {
  W: { name: "White", color: "#F8F6D8" },
  U: { name: "Blue", color: "#0E68AB" },
  B: { name: "Black", color: "#150B00" },
  R: { name: "Red", color: "#D3202A" },
  G: { name: "Green", color: "#00733E" },
  C: { name: "Colorless", color: "#9E9E9E" },
  M: { name: "Multicolor", color: "#C9A227" }
};

// Parse mana cost string to extract CMC and colors
const parseManaInfo = (manaCost?: string): { cmc: number; colors: string[] } => {
  if (!manaCost) return { cmc: 0, colors: [] };
  
  const colors: string[] = [];
  let cmc = 0;
  
  // Match mana symbols like {1}, {W}, {U}, etc.
  const symbols = manaCost.match(/\{([^}]+)\}/g) || [];
  
  symbols.forEach(symbol => {
    const value = symbol.replace(/[{}]/g, '');
    
    if (/^\d+$/.test(value)) {
      cmc += parseInt(value);
    } else if (value === 'X') {
      // X costs count as 0 for CMC calculations
    } else if (['W', 'U', 'B', 'R', 'G'].includes(value)) {
      cmc += 1;
      if (!colors.includes(value)) colors.push(value);
    } else if (value.includes('/')) {
      // Hybrid mana like {W/U}
      cmc += 1;
      value.split('/').forEach(c => {
        if (['W', 'U', 'B', 'R', 'G'].includes(c) && !colors.includes(c)) {
          colors.push(c);
        }
      });
    } else {
      cmc += 1;
    }
  });
  
  return { cmc, colors };
};

export const DeckStatsCharts = ({ mainDeck, commander }: DeckStatsChartsProps) => {
  // Calculate Mana Curve data
  const manaCurveData = (() => {
    const cmcCounts: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    
    mainDeck.forEach(card => {
      const { cmc } = card.cmc !== undefined 
        ? { cmc: card.cmc } 
        : parseManaInfo(card.mana_cost);
      
      const bucket = cmc >= 6 ? 6 : cmc;
      cmcCounts[bucket] = (cmcCounts[bucket] || 0) + card.quantity;
    });
    
    return [
      { cmc: "0", count: cmcCounts[0], label: "0" },
      { cmc: "1", count: cmcCounts[1], label: "1" },
      { cmc: "2", count: cmcCounts[2], label: "2" },
      { cmc: "3", count: cmcCounts[3], label: "3" },
      { cmc: "4", count: cmcCounts[4], label: "4" },
      { cmc: "5", count: cmcCounts[5], label: "5" },
      { cmc: "6+", count: cmcCounts[6], label: "6+" }
    ];
  })();

  // Calculate Color Breakdown data
  const colorBreakdownData = (() => {
    const colorCounts: Record<string, number> = {};
    
    mainDeck.forEach(card => {
      const cardColors = card.colors || parseManaInfo(card.mana_cost).colors;
      
      if (!cardColors || cardColors.length === 0) {
        colorCounts['C'] = (colorCounts['C'] || 0) + card.quantity;
      } else if (cardColors.length > 1) {
        colorCounts['M'] = (colorCounts['M'] || 0) + card.quantity;
      } else {
        const color = cardColors[0];
        colorCounts[color] = (colorCounts[color] || 0) + card.quantity;
      }
    });
    
    return Object.entries(colorCounts)
      .filter(([, count]) => count > 0)
      .map(([color, count]) => ({
        name: COLOR_MAP[color]?.name || color,
        value: count,
        color: COLOR_MAP[color]?.color || "#888"
      }));
  })();

  // Calculate average CMC
  const avgCMC = (() => {
    let totalCMC = 0;
    let totalCards = 0;
    
    mainDeck.forEach(card => {
      const { cmc } = card.cmc !== undefined 
        ? { cmc: card.cmc } 
        : parseManaInfo(card.mana_cost);
      totalCMC += cmc * card.quantity;
      totalCards += card.quantity;
    });
    
    return totalCards > 0 ? (totalCMC / totalCards).toFixed(2) : "0.00";
  })();

  const totalCards = mainDeck.reduce((sum, card) => sum + card.quantity, 0);

  if (totalCards === 0) {
    return (
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Deck Statistics</h2>
        <p className="text-muted-foreground text-center py-8">
          Add cards to see statistics
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Quick Stats */}
      <Card className="p-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">{totalCards}</p>
            <p className="text-xs text-muted-foreground">Total Cards</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">{avgCMC}</p>
            <p className="text-xs text-muted-foreground">Avg. CMC</p>
          </div>
        </div>
      </Card>

      {/* Mana Curve Chart */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold mb-3">Mana Curve</h3>
        <ResponsiveContainer width="100%" height={150}>
          <BarChart data={manaCurveData}>
            <XAxis 
              dataKey="cmc" 
              tick={{ fontSize: 12 }} 
              axisLine={false}
              tickLine={false}
            />
            <YAxis 
              hide 
              domain={[0, 'auto']}
            />
            <Tooltip 
              formatter={(value) => [`${value} cards`, 'Count']}
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))', 
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px'
              }}
            />
            <Bar 
              dataKey="count" 
              fill="hsl(var(--primary))" 
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Color Breakdown Chart */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold mb-3">Color Breakdown</h3>
        {colorBreakdownData.length > 0 ? (
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={colorBreakdownData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={60}
                paddingAngle={2}
                dataKey="value"
              >
                {colorBreakdownData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.color}
                    stroke="hsl(var(--background))"
                    strokeWidth={2}
                  />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value) => [`${value} cards`, '']}
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Legend 
                verticalAlign="bottom" 
                height={36}
                formatter={(value) => <span className="text-xs">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-muted-foreground text-center py-4 text-sm">
            No color data available
          </p>
        )}
      </Card>
    </div>
  );
};
