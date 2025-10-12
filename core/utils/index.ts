/**
 * Omits the specified properties from the target object.
 *
 * @template T - The type of the target object.
 * @template K - The type of the keys that can be used to access the properties of the target object.
 * @param {T} obj - The target object from which the properties will be omitted.
 * @param {K[]} keys - An array of keys that specify the properties to be omitted from the target object.
 * @returns {Omit<T, K>} - A new object containing all the properties of the target object except the ones specified in the `keys` parameter.
 */
export function omit<T, K extends keyof T>(obj: T, ...keys: K[]): Omit<T, K> {
  const ret: Partial<T> = {}; // Use Partial<T> for interim storage
  const keysSet = new Set(keys); // Convert keys to a Set for efficient checking

  // Iterate over the properties of the target object
  for (const key in obj) {
    // If the property is not in the list of keys to omit, add it to the result
    if (!keysSet.has(key as unknown as K)) {
      ret[key] = obj[key];
    }
  }

  // Assert the return type as Omit<T, K>
  return ret as Omit<T, K>;
}

/**
 * Creates a new object with the specified keys from the target object.
 *
 * @template T - The type of the target object.
 * @template K - The type of the keys that can be used to access the properties of the target object.
 * @param {K[] | string[]} whitelisted - An array of keys (or an array of strings) that specify the properties to be included in the new object.
 * @param {T} target - The target object from which the properties will be picked.
 * @param {any} [defaultValue] - (Optional) The default value to be used for the properties that are not present in the target object.
 * @returns {Partial<Pick<T, K>>} - A new object containing the specified properties from the target object, with the default value for the missing properties.
 */
export const pick = <T extends object, K extends keyof T>(whitelisted: K[] | string[], target: T, defaultValue?: any) =>
  // Map over the array of whitelisted keys and create an array of key-value pairs.
  // For each key, check if it exists in the target object. If it does, use its value.
  // If it doesn't, use the default value (if provided) or undefined.
  Object.fromEntries(
    whitelisted.map((key) => [
      // Cast the key to the correct type to access the property of the target object.
      key,
      key in target ? target[key as K] : defaultValue,
    ]),
  );
