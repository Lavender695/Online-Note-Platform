import { IAuthAdapter, User } from "./interfaces";

export class MockAuth implements IAuthAdapter {
  private mockUser: User = { id: 'mock-1', email: 'test@test.com', name: "本地测试用户" }

  async login(email: string): Promise<User> {
    console.log(`[Mock] 用户 ${email} 登录成功`)
    localStorage.setItem('mock_user_id', this.mockUser.id)
    return this.mockUser
  }

  async logout(): Promise<void> {
    console.log('[Mock] 用户登出')
    localStorage.removeItem('mock_user_id')
  }

  async getCurrentUser(): Promise<User | null> {
    const isLogin = localStorage.getItem('mock_user_id')
    return isLogin ? this.mockUser : null
  }
}