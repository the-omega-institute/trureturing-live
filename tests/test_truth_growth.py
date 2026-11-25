from pathlib import Path
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from collect import SourceError
from live import TruthGrowth, frozen_module, growth_record, Observer

TARGET = ('the-omega-institute/trureturing', 'dev')

REPO = '/repos/the-omega-institute/trureturing'


def branch(sha, date='2026-11-25T08:00:00Z'):
    return {'commit': {'sha': sha, 'commit': {'committer': {'date': date}}}}


class API:
    def __init__(self, routes):
        self.routes = routes
        self.calls = []

    def get(self, path, params=None):
        self.calls.append(path)
        value = self.routes[path]
        if isinstance(value, Exception):
            raise value
        return value, ''


def added(path, status='added'):
    return {'filename': path, 'status': status}


class TruthGrowthTests(unittest.TestCase):
    def test_module_paths_come_only_from_frozen_d5_state_files(self):
        self.assertEqual(frozen_module('Golden/Frozen/state/D5/S1/Combinatorics/Words/Lyndon.lean.json'), 'D5/S1/Combinatorics/Words/Lyndon')
        self.assertIsNone(frozen_module('Golden/Frozen/state/Other/Thing.lean.json'))
        self.assertIsNone(frozen_module('D5/S1/Combinatorics/Words/Lyndon.lean'))
        self.assertIsNone(frozen_module('Golden/Frozen/state/D5/S1/Combinatorics/Words/Lyndon.json'))

    def test_a_growth_record_names_its_domain_and_stratum(self):
        record = growth_record('D5/S2/Quantum/Channels/Unital', '2026-11-25T08:00:00Z', 'abc')
        self.assertEqual(record['domain'], 'Quantum')
        self.assertEqual(record['stratum'], 'S2')
        self.assertEqual(record['module'], 'D5/S2/Quantum/Channels/Unital')
        self.assertEqual(growth_record('D5/S0/Loose', 't', 'c')['domain'], 'Other')

    def test_the_first_observation_records_the_frontier_without_replaying_history(self):
        api = API({REPO + '/branches/dev': branch('a' * 40)})
        growth = TruthGrowth(api, *TARGET)
        growth.observe()
        self.assertEqual(growth.head, 'a' * 40)
        self.assertEqual(growth.events, [])
        self.assertEqual(api.calls, [REPO + '/branches/dev'])

    def test_an_unchanged_branch_costs_one_read(self):
        api = API({REPO + '/branches/dev': branch('a' * 40)})
        growth = TruthGrowth(api, *TARGET, {'head': 'a' * 40, 'events': []})
        growth.observe()
        self.assertEqual(api.calls, [REPO + '/branches/dev'])

    def test_only_newly_added_frozen_modules_become_growth(self):
        old, new = 'a' * 40, 'b' * 40
        api = API({
            REPO + '/branches/dev': branch(new, '2026-11-25T08:05:00Z'),
            f'{REPO}/compare/{old}...{new}': {'status': 'ahead', 'total_commits': 2, 'commits': [{}, {}], 'files': [
                added('Golden/Frozen/state/D5/S1/Combinatorics/Words/Lyndon.lean.json'),
                added('Golden/Frozen/state/D5/S2/Quantum/Channels/Unital.lean.json'),
                added('Golden/Frozen/state/D5/S0/Arith/Old.lean.json', 'modified'),
                added('Golden/Frozen/state/D5/S0/Arith/Gone.lean.json', 'removed'),
                added('D5/S1/Combinatorics/Words/Lyndon.lean'),
            ]},
        })
        growth = TruthGrowth(api, *TARGET, {'head': old, 'events': []})
        growth.observe()
        self.assertEqual([e['module'] for e in growth.events], ['D5/S1/Combinatorics/Words/Lyndon', 'D5/S2/Quantum/Channels/Unital'])
        self.assertEqual({e['at'] for e in growth.events}, {'2026-11-25T08:05:00Z'})
        self.assertEqual({e['commit'] for e in growth.events}, {new})
        self.assertEqual(growth.head, new)
        self.assertFalse(growth.snapshot()['truncated'])

    def test_a_rewritten_branch_resets_the_frontier_without_inventing_growth(self):
        old, new = 'a' * 40, 'c' * 40
        api = API({
            REPO + '/branches/dev': branch(new),
            f'{REPO}/compare/{old}...{new}': {'status': 'diverged', 'files': [added('Golden/Frozen/state/D5/S1/Combinatorics/X.lean.json')]},
        })
        growth = TruthGrowth(api, *TARGET, {'head': old, 'events': []})
        growth.observe()
        self.assertEqual(growth.events, [])
        self.assertEqual(growth.head, new)

    def test_a_truncated_comparison_is_reported(self):
        old, new = 'a' * 40, 'b' * 40
        files = [added(f'Golden/Frozen/state/D5/S1/Combinatorics/M{i}.lean.json') for i in range(300)]
        api = API({
            REPO + '/branches/dev': branch(new),
            f'{REPO}/compare/{old}...{new}': {'status': 'ahead', 'total_commits': 1, 'commits': [{}], 'files': files},
        })
        growth = TruthGrowth(api, *TARGET, {'head': old, 'events': []})
        growth.observe()
        self.assertTrue(growth.snapshot()['truncated'])

    def test_saved_growth_is_restored_bounded_and_not_repeated(self):
        events = [growth_record(f'D5/S1/Combinatorics/M{i}', 't', 'c') for i in range(150)]
        growth = TruthGrowth(API({}), *TARGET, {'head': 'a' * 40, 'events': events})
        self.assertEqual(len(growth.events), 120)
        self.assertEqual(growth.events[-1]['module'], 'D5/S1/Combinatorics/M149')
        old, new = 'a' * 40, 'b' * 40
        growth.api = API({
            REPO + '/branches/dev': branch(new),
            f'{REPO}/compare/{old}...{new}': {'status': 'ahead', 'total_commits': 1, 'commits': [{}], 'files': [added('Golden/Frozen/state/D5/S1/Combinatorics/M149.lean.json')]},
        })
        growth.observe()
        self.assertEqual(len([e for e in growth.events if e['module'] == 'D5/S1/Combinatorics/M149']), 1)

    def test_the_observation_publishes_growth_and_reports_its_failures(self):
        class Foundation:
            config = {'sources': []}
            statistics = {}

            def collect(self):
                return {'observed_at': '2026-11-25T08:00:00Z', 'sources': []}

        api = API({
            '/repos/the-omega-institute/trureturing-live/contents/live.json': SourceError('GitHub HTTP 404'),
            REPO + '/branches/dev': branch('a' * 40),
        })
        observer = Observer(api, {'owner': 'the-omega-institute', 'truth_growth': {'repository': TARGET[0], 'branch': TARGET[1]}})
        snapshot = observer.observe(Foundation())
        self.assertEqual(snapshot['truth_growth']['head'], 'a' * 40)
        self.assertEqual(snapshot['truth_growth']['events'], [])
        api.routes[REPO + '/branches/dev'] = SourceError('GitHub HTTP 503')
        snapshot = observer.observe(Foundation())
        self.assertIn('truth-growth: GitHub HTTP 503', snapshot['errors'])
        self.assertEqual(snapshot['truth_growth']['head'], 'a' * 40)

    def test_growth_is_read_only_when_the_deployment_declares_a_truth_repository(self):
        class Foundation:
            config = {'sources': []}
            statistics = {}

            def collect(self):
                return {'observed_at': '2026-11-25T08:00:00Z', 'sources': []}

        api = API({'/repos/the-omega-institute/trureturing-live/contents/live.json': SourceError('GitHub HTTP 404')})
        snapshot = Observer(api, {'owner': 'the-omega-institute'}).observe(Foundation())
        self.assertIsNone(snapshot['truth_growth'])
        self.assertEqual(api.calls, ['/repos/the-omega-institute/trureturing-live/contents/live.json'])

    def test_saved_growth_for_another_target_is_not_reused(self):
        growth = TruthGrowth(API({}), *TARGET, {'repository': 'someone/else', 'branch': 'main', 'head': 'a' * 40, 'events': [growth_record('D5/S1/Combinatorics/M', 't', 'c')]})
        self.assertIsNone(growth.head)
        self.assertEqual(growth.events, [])


if __name__ == '__main__':
    unittest.main()
