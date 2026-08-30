import { execSync } from 'child_process';
import * as path from 'path';

describe('Supabase Row-Level Security (RLS) policies', () => {
  it('should enforce proper tenant segregation and pass all security assertions', () => {
    const scriptPath = path.resolve(__dirname, '../../../scripts/verify_rls_security.ts');
    try {
      const output = execSync(
        `npx ts-node --skip-project -O '{"module": "commonjs"}' "${scriptPath}"`,
        { encoding: 'utf-8', stdio: 'pipe' }
      );
      expect(output).toContain('ALL SECURE CROSS-TENANT RLS POLICIES VERIFIED CORRECTLY');
    } catch (error: any) {
      console.error('RLS Test stdout:', error.stdout);
      console.error('RLS Test stderr:', error.stderr);
      throw error;
    }
  });
});
