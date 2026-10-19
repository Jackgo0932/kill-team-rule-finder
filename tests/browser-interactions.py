#!/usr/bin/env python3
"""Real Chromium interaction checks for the Kill Team static PWA.
Run: python -m pip install playwright && python tests/browser-interactions.py
Requires installed Chromium (or `python -m playwright install chromium`).
"""
from pathlib import Path
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from threading import Thread
from playwright.sync_api import sync_playwright
import os

ROOT=Path(__file__).resolve().parent.parent
class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args): pass

def check(name, action):
    action()
    print('PASS',name)

def main():
    handler=partial(QuietHandler,directory=str(ROOT))
    server=ThreadingHTTPServer(('127.0.0.1',0),handler)
    Thread(target=server.serve_forever,daemon=True).start()
    errors=[]
    try:
        with sync_playwright() as p:
            executable=os.environ.get('KT_CHROMIUM_PATH')
            browser=p.chromium.launch(headless=True,executable_path=executable if executable else None,
                                      args=['--no-sandbox'])
            page=browser.new_page(viewport={'width':1200,'height':800})
            page.on('pageerror',lambda error:errors.append(str(error)))
            page.goto(f'http://127.0.0.1:{server.server_address[1]}/',wait_until='load')
            page.wait_for_selector('#content .weapon, #content .flow-step, #content .card',timeout=15000)
            check('app loads without JavaScript errors',lambda:assert_no_errors(errors))
            page.locator('.nav[data-view="flow"]').click()
            link=page.locator('.flow-step [onclick*="toggleFlowKeyword"]').first
            link.wait_for()
            step=link.locator('xpath=ancestor::*[contains(concat(" ",normalize-space(@class)," ")," flow-step ")]')
            initial=page.evaluate('window.scrollY')
            link.click()
            check('flow keyword opens within its own step',lambda:assert_flow_open(link,step))
            panel=step.locator('.flow-step-explain').first
            check('flow label is a compact capsule',lambda:assert_capsule(panel))
            link.click()
            check('flow keyword closes without removing step',lambda:assert_flow_closed(link,step))
            page.locator('.nav[data-view="all"]').click()
            chips=page.locator('.weapon .dictionary-local-chip')
            if chips.count()==0:
                page.locator('#q').fill('瘟疫戰士')
                chips=page.locator('.weapon .dictionary-local-chip')
            if chips.count()==0:
                raise AssertionError('No weapon rule chip found for browser regression test')
            chip=chips.first
            weapon=chip.locator('xpath=ancestor::*[contains(concat(" ",normalize-space(@class)," ")," weapon ")]')
            chip.click()
            check('weapon rule explanation stays inside weapon',lambda:assert_weapon_open(chip,weapon))
            chip.click()
            check('weapon rule explanation closes',lambda:assert_weapon_closed(chip,weapon))
            # The dictionary remains a reference-only view; selection belongs to
            # the new match setup. Check the actual DOM, not just source strings.
            page.locator('.nav[data-view="all"]').click()
            check('dictionary has no legacy equipment selection buttons',
                  lambda:assert_no_legacy_equipment_picker(page))
            check('no JavaScript errors after interactions',lambda:assert_no_errors(errors))
            browser.close()
    finally:
        server.shutdown()

def assert_no_errors(errors):
    assert not errors,'Browser JavaScript errors: '+repr(errors)

def assert_flow_open(link,step):
    assert link.get_attribute('aria-expanded')=='true'
    assert step.locator('.flow-step-explain').count()==1

def assert_flow_closed(link,step):
    assert link.get_attribute('aria-expanded')=='false'
    assert step.locator('.flow-step-explain').count()==0
    assert step.count()==1

def assert_capsule(panel):
    tag=panel.locator('.term-source')
    assert tag.count()==1
    width=tag.evaluate('(e)=>e.getBoundingClientRect().width')
    parent_width=panel.evaluate('(e)=>e.getBoundingClientRect().width')
    assert width < parent_width*0.7, f'Flow tag stretched: {width}px / {parent_width}px'
    margin=tag.evaluate('(e)=>parseFloat(getComputedStyle(e).marginRight)')
    assert margin>=8,f'Expected label/text gap, got {margin}px'

def assert_weapon_open(chip,weapon):
    assert chip.get_attribute('aria-expanded')=='true'
    assert weapon.locator('.dictionary-local-rule-explanation').count()==1

def assert_weapon_closed(chip,weapon):
    assert chip.get_attribute('aria-expanded')=='false'
    assert weapon.locator('.dictionary-local-rule-explanation').count()==0

if __name__=='__main__':main()


def assert_no_legacy_equipment_picker(page):
    assert page.locator('.equipment-card .equipment-pick').count()==0
    assert page.locator('.equipment-card .equipment-option-picker').count()==0
    assert page.locator('.equipment-card').count()>0
