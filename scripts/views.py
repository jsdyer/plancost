from html import escape
import json
from pathlib import Path
import subprocess
from search_metadata import add_search_metadata

def render_views(stage, template, tool):
    examples = json.loads((stage/'examples.json').read_text())
    # Share arithmetic with the interactive form when generating each indexable result.
    rendered = subprocess.check_output(['node', str(Path(__file__).parent/'render.mjs'), str(stage)], text=True)
    cards = json.loads(rendered)
    for slug, example in [('',examples[0]), *[(e['slug'],e) for e in examples]]:
        base = '../' if slug else './'
        folder = stage/slug
        folder.mkdir(exist_ok=True)
        page = template.replace('ASSET_BASE',base)
        title = example['title'] if slug else tool['title']
        desc = example['description'] if slug else tool['description']
        view = dict(tool, title=title, description=desc, url=tool['url']+(slug+'/' if slug else ''))
        if slug:
            page=page.replace(escape(tool['title']),escape(title)).replace(escape(tool['description']),escape(desc))
        summary=cards[example['slug']]
        links=''.join(f'<a href="{base}{e["slug"]}/">{escape(e["title"])}</a>' for e in examples)
        for token, val in {'EXAMPLE_SLUG':example['slug'],'RESULT_HEAD':summary['headline'],'RESULT_COSTS':summary['totals'],'RESULT_BREAK':summary['crossover']}.items():
            page=page.replace(token,escape(val))
        page=page.replace('EXAMPLE_LINKS',links)
        (folder/'index.html').write_text(add_search_metadata(page,view,category='FinanceApplication'))
