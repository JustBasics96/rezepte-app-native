import AsyncStorage from '@react-native-async-storage/async-storage'

export const kv = {
  async getString(key: string): Promise<string | null> {
    return (await AsyncStorage.getItem(key)) ?? null
  },
  async setString(key: string, value: string): Promise<void> {
    await AsyncStorage.setItem(key, value)
  },
  async remove(key: string): Promise<void> {
    await AsyncStorage.removeItem(key)
  },
  async getJson<T>(key: string): Promise<T | null> {
    const raw = await AsyncStorage.getItem(key)
    if (!raw) return null
    try {
      return JSON.parse(raw) as T
    } catch {
      return null
    }
  },
  async setJson<T>(key: string, value: T): Promise<void> {
    await AsyncStorage.setItem(key, JSON.stringify(value))
  }
}
