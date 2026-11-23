import base64
import json
from pathlib import Path
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from collect import SourceError
from foundation import FoundationReader
from live import Observer

TIME = '2026-11-23T12:00:00Z'
REPO = 'the-omega-institute/trureturing'


class FoundationTests(unittest.TestCase):
    def test_public_checkpoint_rejects_session_identity_and_foreign_sources(self):
        reader = FoundationReader.__new__(FoundationReader)
        reader.config = {'organization':{'id':'trureturing'},'sources':[{'id':'core'}]}
        base = {'schema':'ai-org.checkpoint.v1','organization':'trureturing','heads':{},'recent':[]}
        reader.assert_public_checkpoint(base)
        for event in [{'source':'core','kind':'session'}, {'source':'foreign','kind':'task'}, {'source':'core','kind':'task','actor':{'kind':'agent','tool':'Codex'}}]:
            with self.assertRaises(SourceError):
                reader.assert_public_checkpoint({**base,'recent':[event]})

    def test_large_public_checkpoint_uses_immutable_blob_instead_of_missing_inline_content(self):
        checkpoint={'schema':'ai-org.checkpoint.v1','organization':'trureturing','heads':{},'recent':[]}
        class API:
            def __init__(self): self.paths=[]
            def get(self,path,params=None):
                self.paths.append(path)
                if '/contents/' in path:return {'encoding':'none','sha':'public-blob'},''
                return {'content':base64.b64encode(json.dumps(checkpoint).encode()).decode()},''
        api=API()
        reader=FoundationReader(api,binary=sys.executable)
        try:
            self.assertEqual(json.loads(reader.state_path.read_text()),checkpoint)
            self.assertTrue(api.paths[-1].endswith('/git/blobs/public-blob'))
        finally:reader.close()

    def test_legacy_collaboration_consumes_reader_cache_without_duplicate_api_requests(self):
        class API:
            calls=0
            def get(self,*args,**kwargs):
                self.calls+=1
                raise SourceError('GitHub HTTP 404')
        comment={'id':7,'body':'A new argument.','issue_url':f'https://api.github.com/repos/{REPO}/issues/42','html_url':f'https://github.com/{REPO}/issues/42#issuecomment-7','user':{'login':'researcher'},'created_at':TIME,'updated_at':TIME}
        class Foundation:
            config={'sources':[{'id':'core-discussion','repository':REPO,'kind':'github_comments'}]}
            statistics={'failures':[]}
            def collect(self):return {'schema':'ai-org.live.v1','observed_at':TIME,'sources':[{'id':'core-discussion','observed_at':TIME,'complete':False}],'departments':[]}
            def rows(self,source):return [comment]
        api=API();observer=Observer(api,{'owner':'the-omega-institute'})
        first=observer.observe(Foundation());second=observer.observe(Foundation())
        self.assertEqual(api.calls,1)
        self.assertEqual(len(second['messages']),1)
        self.assertEqual(first['messages'],second['messages'])
        self.assertEqual(second['organization']['schema'],'ai-org.live.v1')

    def test_workflow_cache_respects_the_registered_department_source(self):
        reader=FoundationReader.__new__(FoundationReader)
        reader.cache={
            json.dumps([f'/repos/{REPO}/actions/workflows/ci-current.yml/runs',[]]):{'value':{'workflow_runs':[{'id':1}]}},
            json.dumps([f'/repos/{REPO}/actions/workflows/truth-release-publish.yml/runs',[]]):{'value':{'workflow_runs':[{'id':2}]}}
        }
        rows=reader.rows({'repository':REPO,'kind':'github_actions','workflow_paths':['.github/workflows/ci-current.yml']})
        self.assertEqual(rows,[{'id':1}])

    def test_cold_reader_cache_preserves_the_last_actual_workflow_observation(self):
        class API:
            def get(self,*args,**kwargs):raise SourceError('GitHub HTTP 404')
        class Foundation:
            config={'sources':[{'id':'core-checks','repository':REPO,'kind':'github_actions'}]}
            statistics={'failures':[]}
            def collect(self):return {'schema':'ai-org.live.v1','observed_at':TIME,'sources':[{'id':'core-checks','observed_at':TIME,'complete':False}],'departments':[]}
            def rows(self,source):return None
        observer=Observer(API(),{'owner':'the-omega-institute'})
        previous={'observed_at':'2026-11-23T11:59:50Z','runs':[{'id':42,'status':'in_progress'}]}
        observer.runs={REPO:previous}
        observed=observer.observe(Foundation())
        self.assertEqual(observed['focus_runs'][REPO],previous)
        self.assertNotIn('core-checks',observer.loaded_sources)
