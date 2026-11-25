from pathlib import Path
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from sync_truth_nebula import build_nebula


def node(path, domain, title, summary, role='internal', layer=1, theorems=2):
    return [path, 'truth', 0, title, summary, domain, 'Closed', 0, 0, 'certified-topology.v1', role, 0, layer, 0, 1, '0',
            {'eligible': True, 'freeze_status': 'frozen', 'declaration_count': theorems + 1, 'theorem_count': theorems}, 0]


def atlas():
    nodes = [node(f'D5/S1/Combinatorics/M{i}', 'Combinatorics', f'Title {i}', f'Summary {i}.', layer=i % 4) for i in range(6)]
    nodes += [node(f'D5/S2/Quantum/Q{i}', 'Quantum', f'Quantum {i}', '' if i == 0 else f'Q summary {i}.') for i in range(4)]
    nodes.append(['B/blueprint/x', 'blueprint', 0, 'Blueprint', 'not truth', 'Combinatorics'])
    edges = [[0, 1, 'truth-dependency', None], [1, 2, 'truth-dependency', None], [6, 7, 'truth-dependency', None], [2, 6, 'truth-dependency', None]]
    positions = [[(i % 5) * 10.0, (i // 5) * 7.0, i * 1.5] for i in range(len(nodes))]
    graph = {'nodes': nodes, 'edges': edges, 'source_snapshot': {'source_commit': 'abc'}}
    return {'truth_release_digest': 'sha256:r'}, {'positions': positions}, graph


class NebulaDetailTests(unittest.TestCase):
    def test_every_sampled_star_has_its_module_details_in_the_same_order(self):
        nebula, details = build_nebula(*atlas())
        self.assertEqual(details['schema_version'], 'trureturing-truth-nebula-details.v1')
        self.assertEqual(details['truth_release_digest'], nebula['truth_release_digest'])
        self.assertEqual(details['source_commit'], nebula['source_commit'])
        self.assertEqual(len(details['stars']), len(nebula['stars']))
        clusters = {c['id']: c['name'] for c in nebula['clusters']}
        for star, row in zip(nebula['stars'], details['stars']):
            module, title, summary, role, layer, theorems, prereq_count, dependent_count, prereqs, dependents = row
            domain = module.split('/')[2]
            self.assertEqual(clusters[star[3]], domain, 'a detail row belongs to the galaxy of its star')
            self.assertEqual(title, ('Quantum ' if domain == 'Quantum' else 'Title ') + module.rsplit('/', 1)[1][1:])
            self.assertIn(role, {'internal'})
            self.assertEqual(theorems, 2)
        self.assertTrue(all(row[0].startswith('D5/') for row in details['stars']), 'blueprint nodes are not stars')
        self.assertIn('D5/S2/Quantum/Q0', [row[0] for row in details['stars']])

    def test_each_star_knows_its_prerequisites_and_dependents_among_the_stars(self):
        nebula, details = build_nebula(*atlas())
        index = {row[0]: i for i, row in enumerate(details['stars'])}
        m1 = details['stars'][index['D5/S1/Combinatorics/M1']]
        self.assertEqual(m1[6:8], [1, 1], 'M1 has one prerequisite (M0) and one dependent (M2)')
        self.assertEqual(m1[8], [index['D5/S1/Combinatorics/M0']])
        self.assertEqual(m1[9], [index['D5/S1/Combinatorics/M2']])
        m2 = details['stars'][index['D5/S1/Combinatorics/M2']]
        self.assertEqual(m2[9], [index['D5/S2/Quantum/Q0']], 'dependencies cross galaxies')
        q1 = details['stars'][index['D5/S2/Quantum/Q1']]
        self.assertEqual(q1[8], [index['D5/S2/Quantum/Q0']])
        self.assertEqual(details['stars'][index['D5/S1/Combinatorics/M5']][6:], [0, 0, [], []])

    def test_long_summaries_are_shortened(self):
        manifest, layout, graph = atlas()
        graph['nodes'][0][4] = 'x' * 900
        _, details = build_nebula(manifest, layout, graph)
        summary = next(row[2] for row in details['stars'] if row[0] == 'D5/S1/Combinatorics/M0')
        self.assertLessEqual(len(summary), 241)
        self.assertTrue(summary.endswith('…'))


if __name__ == '__main__':
    unittest.main()
