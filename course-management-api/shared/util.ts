
export function generateBatch(items: any[]) {
  if (!items || !Array.isArray(items)) {
    console.error('Invalid items input:', items);
    return [];
  }

  const isValidItem = (item: any) => 
    item && 
    typeof item === 'object' &&
    Object.keys(item).length > 0 &&
    !Array.isArray(item);

  return items
    .filter(isValidItem)
    .map((item) => ({
      PutRequest: {
        Item: item, 
      },
    }));
}