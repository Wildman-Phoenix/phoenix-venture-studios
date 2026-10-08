import {render,screen,fireEvent,waitFor,cleanup} from '@testing-library/react';
import {describe,it,expect,vi,afterEach} from 'vitest';
import NewsletterSignup from '@/components/NewsletterSignup';
const mocks=vi.hoisted(()=>({invoke:vi.fn(),validate:vi.fn(async()=>({valid:true})),reset:vi.fn(),toast:vi.fn(),ref:{current:null}}));
vi.mock('@/integrations/supabase/client',()=>({isSupabaseConfigured:true,supabase:{functions:{invoke:mocks.invoke}}}));
vi.mock('@/hooks/use-toast',()=>({useToast:()=>({toast:mocks.toast})}));
vi.mock('@/hooks/useFormSecurity',()=>({useFormSecurity:()=>({honeypot:'',setHoneypot:vi.fn(),turnstileRef:mocks.ref,validateSubmission:mocks.validate,resetTurnstile:mocks.reset,isValidating:false,hasTurnstile:true})}));
vi.mock('@/components/ScrollReveal',()=>({default:({children}:any)=>children}));
vi.mock('@/components/FormSecurityFields',()=>({default:()=> <div data-testid="challenge"/>}));
afterEach(()=>{cleanup();vi.clearAllMocks()});
async function subscribe(){render(<NewsletterSignup/>);const widget=screen.getByTestId('challenge');fireEvent.change(screen.getByPlaceholderText('you@example.com'),{target:{value:' Founder@Example.TEST '}});fireEvent.click(screen.getByRole('button',{name:'Subscribe to Founder Signal'}));await screen.findByText("You're on the Founder Signal list.");expect(screen.getByTestId('challenge')).toBe(widget);return widget;}
describe('server-owned welcome delivery',()=>{
 it('shows saved subscription failure and retries welcome only with security validation',async()=>{
 mocks.invoke.mockResolvedValueOnce({data:{success:true,welcome_delivery:{delivered:false,reason:'delivery_failed'}}}).mockResolvedValueOnce({data:{success:true,welcome_delivery:{delivered:true}}});
 await subscribe();expect(screen.getByText(/subscription is saved, but/)).toBeTruthy();fireEvent.click(screen.getByRole('button',{name:'Retry welcome message'}));await screen.findByText(/provider accepted your welcome/);
 expect(mocks.validate).toHaveBeenCalledTimes(2);expect(mocks.reset).toHaveBeenCalledTimes(2);expect(mocks.invoke.mock.calls.map(c=>c[0])).toEqual(['submit-form','submit-form']);expect(mocks.invoke.mock.calls[1][1].body).toEqual({formType:'newsletter_welcome_retry',data:{email:'founder@example.test',security_form_name:'newsletter'}});
 });
 it('holds uncertain provider receipts for review without an unsafe retry button',async()=>{
 mocks.invoke.mockResolvedValue({data:{success:true,welcome_delivery:{delivered:false,reason:'receipt_requires_review'}}});await subscribe();expect(screen.getByText(/needs a delivery check/)).toBeTruthy();expect(screen.queryByRole('button',{name:'Retry welcome message'})).toBeNull();
 });
 it('does not interpret HTTP success as subscription success',async()=>{
 mocks.invoke.mockResolvedValue({data:{success:false,error:'fixture failure'}});render(<NewsletterSignup/>);fireEvent.change(screen.getByPlaceholderText('you@example.com'),{target:{value:'a@example.test'}});fireEvent.click(screen.getByRole('button',{name:'Subscribe to Founder Signal'}));await waitFor(()=>expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({variant:'destructive'})));expect(screen.queryByText("You're on the Founder Signal list.")).toBeNull();
 });
});
