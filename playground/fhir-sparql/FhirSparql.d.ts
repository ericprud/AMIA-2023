import { QueryAnalyzer } from './QueryAnalyzer';
import { SparqlSolution, Meta } from './RdfUtils';
import { PosArcTree, ArcTree } from './ArcTree';
import * as ShExJ from 'shexj';
import { ArcTreeFitsInShapeExpr } from './ArcTreeFitsInShapeExpr';

declare class ConnectingVariables {
    static toString(cvs: Map<string, PosArcTree[]>): string;
}
declare class Rule {
    fhirQuery: string;
    arg: (values: string[]) => string;
    arcTree: ArcTree;
    constructor(fhirQuery: string, sparql: string, arg?: (values: string[]) => string);
    toString(): string;
}
declare const Rule_CodeWithSystem: Rule;
declare class QueryParam {
    name: string;
    value: string;
    constructor(name: string, value: string);
}
declare class FhirPathExecution {
    type: string;
    version: string | null;
    paths: QueryParam[];
    constructor(type: string, version: string | null, paths: QueryParam[]);
}
declare class FhirSparql extends QueryAnalyzer {
    tester: ArcTreeFitsInShapeExpr;
    constructor(shex: ShExJ.Schema);
    opBgpToFhirPathExecutions(arcTree: ArcTree, referents: Set<string>, sparqlSolution: SparqlSolution, meta?: Meta): FhirPathExecution[];
}

export { ConnectingVariables, FhirPathExecution, FhirSparql, Rule_CodeWithSystem };
//# sourceMappingURL=FhirSparql.d.ts.map
