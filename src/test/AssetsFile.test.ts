import {describe, expect, test} from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { AssetsFile } from '../files/AssetsFile';


describe('Assets file class', () => {
    test('Can read an existing file', async () => {
        const name = 'name.txt';
        await fs.writeFile(path.join(process.cwd(), 'assets', name), 'Demo content', 'utf-8');
        const file = new AssetsFile(name, 'utf-8');
        await file.read();
        expect(file.initialized()).toBeTruthy();
        expect(file.asString()).toEqual('Demo content');
        expect(file.asBuffer().toString('utf-8')).toEqual('Demo content');
        expect(file.basename()).toEqual(name);
        expect(file.source()).toEqual("assets");
        expect(file.encoding()).toEqual("utf-8");
        expect(file.path()).toEqual(path.join(process.cwd(), 'assets', name));
        expect(file.extension()).toEqual('.txt');
        expect(file.size()).toEqual(Buffer.byteLength('Demo content'));
        await fs.rm(path.join(process.cwd(), 'assets', name));
    });

    test('Can create a new file', async () => {
        const name = 'name.txt';
        const file = new AssetsFile(name, 'utf-8');
        await file.write('Demo content');
        expect(file.initialized()).toBeTruthy();
        expect(file.asString()).toEqual('Demo content');
        expect(file.asBuffer().toString('utf-8')).toEqual('Demo content');
        expect(file.basename()).toEqual(name);
        expect(file.source()).toEqual("assets");
        expect(file.encoding()).toEqual("utf-8");
        expect(file.path()).toEqual(path.join(process.cwd(), 'assets', name));
        expect(file.extension()).toEqual('.txt');
        expect(file.size()).toEqual(Buffer.byteLength('Demo content'));
        await fs.rm(path.join(process.cwd(), 'assets', name));
    });

    test('Can delete a file', async () => {
        const name = 'name.txt';
        const file = new AssetsFile(name, 'utf-8');
        const dir = path.join(process.cwd(), 'assets');
        await fs.writeFile(path.join(dir, name), 'Demo content', 'utf-8');
        await file.delete();
        const files = await fs.readdir(dir);
        expect(files).not.toContain('name.txt');
    });
}) 
