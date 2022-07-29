/*
	iCertus Framework
	[ CRUD/Sheet ]

	Handles reading and writing of sheet files (.csv, .xls, etc)
*/

import { Exception } from '@adonisjs/core/build/standalone';
import { ParseNumeric } from './Format';
import * as XLSX from 'xlsx';
import { Status } from '../Exception';

/**
 * Return a column number from the column name ('A', 'Z', 'AA', 'ABC', etc).
 */
function ColToI(col: string) {
    let n = 0;
    for (let i = 0; i < col.length; i++) {
        n += (col[i].charCodeAt(0) - 65) + (26**(col.length-i-1));
    }
    return n;
}

/**
 * Return a column name ('A', 'Z', 'AA', 'ABC', etc) from the column number.
 */
function IToCol(i: number) {
    let col = '';

    while (i > 0) {
        let n = 0;
        while (26**(n+1) < i) n++;
        
        let j = Math.floor(i/26**n);
        i = i % 26**n;
    
        col = String.fromCharCode(j + 64) + col;
    }
    
    return col;
}

/**
 * Data extracted from a sheet file
 */
export type SheetData = Record<string, string|number>[];

/**
 * Handles reading and writing of sheet files (.csv, .xls, etc)
 */
export default class Sheet {

    /**
     * Read and parse data from a sheet file
     */
    static Read(filename: string, numeric_cols: string[] = []): SheetData {

        let data = [] as SheetData;

        try {
            let workbook = XLSX.readFile(filename, {codepage: 65001});
            data = this.ParseWorkBook(workbook); 
        }
        catch (e) {
            throw SheetException.InvalidFile();
        }

        data.map(d => {
            Object.keys(d).map(col => {
                if (numeric_cols.includes(col)) {
                    let parsed = ParseNumeric(d[col]);
                    if (parsed === undefined)
                        throw SheetException.InvalidNumericValue(d[col] as string);
                    d[col] = parsed;
                }
            })
        })

        return data;
    }

    /**
     * Parse the file data.
     */
    private static ParseWorkBook(workbook: XLSX.WorkBook): Record<string,any>[] {

        let sheet = workbook.Sheets[Object.keys(workbook.Sheets)[0]];
        
        
        let ref = sheet['!ref']?.match(/([A-Z]+)(\d+):([A-Z]+)(\d+)/);    
        let range = {
            cols: [ColToI(ref![1]),ColToI(ref![3])],
            rows: [parseInt(ref![2]),parseInt(ref![4])]
        }
        
        let headers = [] as string[];
        for (let i = range.cols[0]; i <= range.cols[1]; i++) {
            let cell = IToCol(i)+'1';
            if (!sheet[cell]) continue;
            let v = sheet[cell].v;
            if (v.charCodeAt(0) > 255) v = v.slice(1);
            headers.push(v);
        }
    
        let objs = [] as Record<string,any>[];
        for (let i = range.rows[0]+1; i <= range.rows[1]; i++) {
            let obj = {} as any;
            for (let j = range.cols[0]; j <= range.cols[1]; j++) {
                let cell = IToCol(j)+i;
                if (!sheet[cell]) continue;
                obj[headers[j-1]] = sheet[cell].w || sheet[cell].v;
            }
            objs.push(obj);
        }
    
        return objs;
    }

}

class SheetException extends Exception {
	static code = 'E_SHEET_EXCEPTION'

    static InvalidFile() {
        return new this(`Arquivo inválido. Caso o erro persista, tente outra extensão`, Status.BADREQUEST, this.code)
    }

    static InvalidNumericValue(value: string) {
        return new this(`Valor numérico inválido: ${value}`, Status.BADREQUEST, this.code)
    }

}