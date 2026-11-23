import importlib.util
from pathlib import Path
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from collect import SourceError
from live import excerpt, message_record, Publisher, Observer


class LiveTests(unittest.TestCase):
    def test_comment_keeps_source_attribution_without_inventing_a_session(self):
        record = message_record({'id': 7, 'body': '@reviewer Please check https://github.com/the-omega-institute/trureturing-books/pull/9', 'issue_url': 'https://api.github.com/repos/the-omega-institute/trureturing/issues/8', 'html_url': 'https://github.com/the-omega-institute/trureturing/issues/8#issuecomment-7', 'user': {'login': 'account'}, 'created_at': '2026-11-23T00:00:00Z', 'updated_at': '2026-11-23T00:00:00Z'}, 'the-omega-institute/trureturing', 'comment', 'the-omega-institute')
        self.assertEqual(record['number'], 8)
        self.assertEqual(record['mentions'], ['reviewer'])
        self.assertIsNone(record['session'])
        self.assertEqual(record['references'][0]['number'], 9)
        self.assertNotIn('online', record)

    def test_excerpts_do_not_export_code_dumps_contacts_or_credential_patterns(self):
        value = excerpt('Progress. ```python\nsecret()\n``` <b>Checked</b> a@example.com /Users/person/private ghp_abcdefghijklmnopqrstuvw')
        self.assertNotIn('secret()', value)
        self.assertNotIn('a@example.com', value)
        self.assertNotIn('/Users/', value)
        self.assertNotIn('ghp_', value)
        self.assertIn('Progress.', value)

    def test_publisher_refuses_an_unowned_branch(self):
        class API:
            def get(self, path):
                if '/git/ref/' in path:
                    return {'object': {'sha': 'existing'}}, ''
                return {'message': 'Human work', 'parents': []}, ''
            def write(self, *args, **kwargs):
                raise AssertionError('must not write an unowned branch')
        with self.assertRaises(SourceError):
            Publisher(API()).publish({'observed_at': 'now'})

    def test_publisher_stops_if_another_writer_changes_the_pointer(self):
        class API:
            def get(self, path):
                return {'object': {'sha': 'other-writer'}}, ''
        publisher = Publisher(API())
        publisher.checked, publisher.head = True, 'previous'
        with self.assertRaises(SourceError):
            publisher.publish({'observed_at': 'now'})

    def test_total_source_failure_cannot_renew_the_observation_timestamp(self):
        class API:
            def get(self, *args, **kwargs):
                raise SourceError('GitHub HTTP 503')
        observer = Observer(API(), {'owner': 'the-omega-institute'})
        observer.specs = [{'name': 'trureturing'}, {'name': 'trureturing-books'}]
        observer.tick = 1
        observer.messages = {'old': {'id': 'old', 'updated_at': '2020-01-01T00:00:00Z'}}
        with self.assertRaises(SourceError):
            observer.observe()
