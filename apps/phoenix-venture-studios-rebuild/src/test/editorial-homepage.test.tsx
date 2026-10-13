import {render,screen,waitFor,cleanup} from '@testing-library/react';import {describe,it,expect,vi,afterEach} from 'vitest';
import FounderIntelligenceFeed from '@/components/FounderIntelligenceFeed';
const mocks=vi.hoisted(()=>({load:vi.fn(),invoke:vi.fn()}));
vi.mock('@/lib/static-rss-feed',()=>({loadMergedStaticRssFeeds:mocks.load}));
vi.mock('@/components/ScrollReveal',()=>({default:({children}:any)=>children}));
vi.mock('@/integrations/supabase/client',()=>({isSupabaseConfigured:true,supabase:{functions:{invoke:mocks.invoke}}}));
afterEach(()=>{cleanup();localStorage.clear();vi.clearAllMocks()});
describe('homepage editorial hold',()=>{it('ignores old cache and pending feed records without invoking an unrestricted fallback',async()=>{
 localStorage.setItem('pvs_intel_feed_v2',JSON.stringify({articles:[{headline:'Unreviewed cached story'}],ts:Date.now()}));mocks.load.mockResolvedValue({articles:[{headline:'Pending feed story',promotionEligible:false}]});render(<FounderIntelligenceFeed/>);await waitFor(()=>expect(mocks.load).toHaveBeenCalledWith(Number.MAX_SAFE_INTEGER));expect(screen.queryByText('Unreviewed cached story')).toBeNull();expect(screen.queryByText('Pending feed story')).toBeNull();expect(mocks.invoke).not.toHaveBeenCalled();
})});
