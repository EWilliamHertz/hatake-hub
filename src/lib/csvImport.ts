import { searchScryDex, CardResult } from './firebase-functions';

// Enhanced header mapping for ManaBox and other common CSV formats
const MANABOX_HEADERS = {
  name: ['name', 'card', 'card name', 'cardname'],
  quantity: ['quantity', 'qty', 'count', 'amount'],
  set_name: ['set name', 'edition name', 'set', 'expansion', 'expansion name'],
  set: ['set', 'set code', 'edition', 'expansion code'],
  collector_number: ['card number', 'collector number', 'number', 'card #', '#'],
  condition: ['condition', 'grade', 'state'],
  language: ['language', 'lang'],
  is_foil: ['foil', 'printing', 'finish', 'treatment', 'premium'],
  rarity: ['rarity', 'rare'],
  price: ['price', 'value', 'cost']
};

function findHeaderIndex(headers: string[], possibleNames: string[]): number {
  for (const name of possibleNames) {
    const index = headers.findIndex(header => {
      const cleanHeader = header.toLowerCase().trim().replace(/['"]/g, '');
      const cleanName = name.toLowerCase().trim();
      return cleanHeader === cleanName || cleanHeader.includes(cleanName);
    });
    if (index > -1) {
      return index;
    }
  }
  return -1;
}

// Enhanced CSV line parser that properly handles quotes, commas, and special characters
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Handle escaped quotes
        current += '"';
        i += 2;
        continue;
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim().replace(/^"|"$/g, ''));
      current = '';
    } else {
      current += char;
    }
    i++;
  }

  // Add the last field
  result.push(current.trim().replace(/^"|"$/g, ''));
  return result;
}

// Enhanced CSV detection and parsing
function detectCsvFormat(lines: string[]): { delimiter: string; headerLine: string } {
  if (lines.length < 2) {
    throw new Error("CSV file must have a header row and at least one data row.");
  }

  const headerLine = lines[0];
  let delimiter = ',';

  // Try to detect delimiter
  const commaCount = (headerLine.match(/,/g) || []).length;
  const semicolonCount = (headerLine.match(/;/g) || []).length;
  const tabCount = (headerLine.match(/\t/g) || []).length;

  if (semicolonCount > commaCount && semicolonCount > tabCount) {
    delimiter = ';';
  } else if (tabCount > commaCount && tabCount > semicolonCount) {
    delimiter = '\t';
  }

  return { delimiter, headerLine };
}

export interface ParsedCard {
  name: string;
  quantity: number;
  set_name: string;
  set: string;
  collector_number: string;
  condition: string;
  language: string;
  is_foil: boolean;
  rarity: string;
  original_price: string;
}

export function parseCSV(file: File): Promise<ParsedCard[]> {
  return new Promise((resolve, reject) => {
    if (!file) {
      return reject(new Error("No file provided."));
    }

    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const csv = event.target?.result as string;
        const lines = csv.split(/\r\n|\n/).filter(line => line.trim());

        if (lines.length < 2) {
          return reject(new Error("CSV file must have a header row and at least one data row."));
        }

        const { delimiter } = detectCsvFormat(lines);
        const headers = lines[0].split(delimiter).map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
        console.log('Detected CSV headers:', headers);

        const headerMapping = {
          name: findHeaderIndex(headers, MANABOX_HEADERS.name),
          quantity: findHeaderIndex(headers, MANABOX_HEADERS.quantity),
          set_name: findHeaderIndex(headers, MANABOX_HEADERS.set_name),
          set: findHeaderIndex(headers, MANABOX_HEADERS.set),
          collector_number: findHeaderIndex(headers, MANABOX_HEADERS.collector_number),
          condition: findHeaderIndex(headers, MANABOX_HEADERS.condition),
          language: findHeaderIndex(headers, MANABOX_HEADERS.language),
          is_foil: findHeaderIndex(headers, MANABOX_HEADERS.is_foil),
          rarity: findHeaderIndex(headers, MANABOX_HEADERS.rarity),
          price: findHeaderIndex(headers, MANABOX_HEADERS.price)
        };

        console.log('Header mapping:', headerMapping);

        if (headerMapping.name === -1) {
          return reject(new Error('Could not find a "Name" or "Card" column in the CSV. Available headers: ' + headers.join(', ')));
        }

        const parsedCsvData: ParsedCard[] = [];

        for (let i = 1; i < lines.length; i++) {
          const data = delimiter === ',' ? parseCsvLine(lines[i]) : lines[i].split(delimiter);

          if (data.length < headers.length) {
            console.warn(`Row ${i + 1} has fewer columns than headers, skipping`);
            continue;
          }

          const cardName = data[headerMapping.name]?.trim();
          if (!cardName) {
            console.warn(`Row ${i + 1} has no card name, skipping`);
            continue;
          }

          // Enhanced foil detection
          const foilRaw = data[headerMapping.is_foil] || '';
          const isFoil = foilRaw.toLowerCase().includes('true') ||
                        foilRaw.toLowerCase().includes('yes') ||
                        foilRaw.toLowerCase().includes('foil') ||
                        foilRaw.toLowerCase().includes('premium') ||
                        foilRaw === '1';

          // Enhanced quantity parsing
          let quantity = 1;
          if (headerMapping.quantity !== -1) {
            const qtyRaw = data[headerMapping.quantity];
            quantity = parseInt(qtyRaw, 10) || 1;
          }

          const card: ParsedCard = {
            name: cardName,
            quantity: quantity,
            set_name: data[headerMapping.set_name]?.trim() || '',
            set: data[headerMapping.set]?.trim() || '',
            collector_number: data[headerMapping.collector_number]?.trim() || '',
            condition: data[headerMapping.condition]?.trim() || 'Near Mint',
            language: data[headerMapping.language]?.trim() || 'English',
            is_foil: isFoil,
            rarity: data[headerMapping.rarity]?.trim() || '',
            original_price: data[headerMapping.price]?.trim() || ''
          };

          parsedCsvData.push(card);
        }

        console.log(`Successfully parsed ${parsedCsvData.length} cards from CSV`);
        resolve(parsedCsvData);
      } catch (error) {
        console.error("Error parsing CSV:", error);
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error("Failed to read the file."));
    };

    reader.readAsText(file);
  });
}

export interface ProcessResult {
  index: number;
  status: 'success' | 'error' | 'processing';
  card?: CardResult & {
    quantity: number;
    condition: string;
    language: string;
    is_foil: boolean;
    csv_data?: {
      original_name: string;
      original_set: string;
      original_set_name: string;
      original_collector_number: string;
      original_price: string;
    };
  };
  originalName: string;
  error?: string;
  originalData?: ParsedCard;
}

export async function processCSVImport(
  cards: ParsedCard[],
  updateCallback?: (index: number, status: 'processing' | 'success' | 'error', message: string) => void,
  selectedGame: 'magic' | 'pokemon' | 'lorcana' | 'optcg' = 'magic'
): Promise<ProcessResult[]> {
  const results: ProcessResult[] = [];

  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    updateCallback && updateCallback(i, 'processing', `Processing ${card.name}...`);

    try {
      // Normalize collector number by stripping leading zeros
      const normalizedCollectorNumber = card.collector_number ? card.collector_number.replace(/^0+/, '') : '';
      
      // Build search query with improved logic
      let searchQuery = `!"${card.name}"`;

      // Add set information if available
      if (card.set && card.set.length > 0) {
        searchQuery += ` set:${card.set.toLowerCase()}`;
      } else if (card.set_name && card.set_name.length > 0) {
        // Try to use set name if set code is not available
        searchQuery += ` set:"${card.set_name}"`;
      }

      // Add collector number if available (normalized)
      if (normalizedCollectorNumber.length > 0) {
        searchQuery += ` cn:${normalizedCollectorNumber}`;
      }

      console.log(`[${i+1}/${cards.length}] Searching: ${searchQuery} (game: ${selectedGame})`);

      // Strategy 1: Try full query (Name + Set + Collector Number)
      let searchResult = await searchScryDex({
        query: searchQuery,
        game: selectedGame,
        limit: 1
      });

      // Strategy 2: If no results, try Name + Set only (no collector number)
      if (!searchResult.success || !searchResult.data || searchResult.data.length === 0) {
        const setOnlyQuery = card.set 
          ? `!"${card.name}" set:${card.set.toLowerCase()}`
          : card.set_name 
            ? `!"${card.name}" set:"${card.set_name}"`
            : null;
        
        if (setOnlyQuery) {
          console.warn(`   → Trying without collector number: ${setOnlyQuery}`);
          searchResult = await searchScryDex({
            query: setOnlyQuery,
            game: selectedGame,
            limit: 1
          });
        }
      }

      // Strategy 3: If still no results, try name-only search
      if (!searchResult.success || !searchResult.data || searchResult.data.length === 0) {
        console.warn(`   → Trying name-only: !"${card.name}"`);
        const simpleQuery = `!"${card.name}"`;
        searchResult = await searchScryDex({
          query: simpleQuery,
          game: selectedGame,
          limit: 1
        });
      }

      // Strategy 4: Last resort - try without quotes
      if (!searchResult.success || !searchResult.data || searchResult.data.length === 0) {
        console.warn(`   → Last resort, unquoted: ${card.name}`);
        searchResult = await searchScryDex({
          query: card.name,
          game: selectedGame,
          limit: 1
        });
      }

      if (searchResult.success && searchResult.data && searchResult.data.length > 0) {
        const foundCard = searchResult.data[0];
        
        // Log detailed card data for debugging
        console.log(`✅ [${i+1}/${cards.length}] Found: ${card.name}`);
        console.log(`   API ID: ${foundCard.api_id || foundCard.id}`);
        console.log(`   Set: ${foundCard.set_name || 'N/A'}`);
        console.log(`   Prices:`, {
          usd: foundCard.prices?.usd || null,
          usd_foil: foundCard.prices?.usd_foil || null,
          eur: foundCard.prices?.eur || null,
          eur_foil: foundCard.prices?.eur_foil || null
        });
        console.log(`   Images:`, foundCard.image_uris || foundCard.images?.[0] || 'No images');

        // Merge CSV data with found card data
        const cardToImport = {
          ...foundCard,
          quantity: card.quantity,
          condition: card.condition,
          language: card.language,
          is_foil: card.is_foil,
          // Preserve original CSV data for reference
          csv_data: {
            original_name: card.name,
            original_set: card.set,
            original_set_name: card.set_name,
            original_collector_number: card.collector_number,
            original_price: card.original_price
          }
        };

        results.push({
          index: i,
          status: 'success',
          card: cardToImport,
          originalName: card.name
        });

        updateCallback && updateCallback(i, 'success', 'Found');
      } else {
        console.warn(`❌ [${i+1}/${cards.length}] Not found: ${card.name}`);
        console.warn(`   Query: ${searchQuery}`);
        console.warn(`   Game: ${selectedGame}`);
        
        results.push({
          index: i,
          status: 'error',
          error: 'Card not found',
          originalName: card.name,
          originalData: card
        });

        updateCallback && updateCallback(i, 'error', 'Not found');
      }
    } catch (error) {
      console.error(`Error processing ${card.name}:`, error);
      results.push({
        index: i,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        originalName: card.name,
        originalData: card
      });

      updateCallback && updateCallback(i, 'error', error instanceof Error ? error.message : 'Unknown error');
    }

    // Small delay to prevent overwhelming the API
    await new Promise(resolve => setTimeout(resolve, 150));
  }

  // Log final summary
  const successful = results.filter(r => r.status === 'success').length;
  const failed = results.filter(r => r.status === 'error').length;
  const withPrices = results.filter(r => 
    r.status === 'success' && 
    (r.card?.prices?.usd || r.card?.prices?.eur || r.card?.prices?.usd_foil || r.card?.prices?.eur_foil)
  ).length;
  
  console.log('═══════════════════════════════════════');
  console.log('CSV IMPORT SUMMARY:');
  console.log(`✅ Successfully matched: ${successful}/${cards.length} cards`);
  console.log(`💰 Cards with pricing data: ${withPrices}/${successful}`);
  console.log(`❌ Failed to match: ${failed}/${cards.length} cards`);
  console.log('═══════════════════════════════════════');

  return results;
}