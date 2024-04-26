/// <reference types="tree-sitter-cli/dsl" />

// <- or ←
const assignment_operator = choice("<-", "\u2190");

const _binop = ($, p, op) =>
  prec.left(
    p,
    seq(field("left", $._expression), op, field("right", $._expression)),
  );

const P = {
  unary: 10,
  exponent: 6,
  muldiv: 5,
  addsub: 4,
  comparator: 3,
  andor: 2,
};

module.exports = grammar({
  name: "cie",

  extras: ($) => [$.comment, /\s/],

  supertypes: ($) => [$._statement, $._expression],
  inline: ($) => [$._type, $._literal, $._identifier_ref],

  word: ($) => $.identifier,

  rules: {
    source_file: ($) => repeat($._statement),
    block: ($) => repeat1($._statement),

    _statement: ($) =>
      choice(
        $.variable_declaration,
        $.constant_declaration,
        $.assignment,
        $.input_statement,
        $.output_statement,
        $.procedure_declaration,
        $.function_declaration,
        $.procedure_call,
        $.return_statement,
        $.if_statement,
        $.case_statement,
        $.for_statement,
        $.repeat_statement,
        $.while_statement,
        $.open_file,
        $.close_file,
        $.read_file,
        $.write_file,
      ),
    _expression: ($) =>
      choice(
        $.parenthesized_expression,
        $.binary_op,
        $.unary_op,
        $._literal,
        $._identifier_ref,
        $.function_call,
      ),
    parenthesized_expression: ($) =>
      seq("(", field("expression", $._expression), ")"),

    _type: ($) => choice($.basic_type, $.array_type),

    identifier: () => /[A-Z][A-Za-z0-9]*/,
    array_index: ($) =>
      seq(
        field("array", $.identifier),
        "[",
        field("index1", $._expression),
        optional(seq(",", field("index2", $._expression))),
        "]",
      ),
    _identifier_ref: ($) => choice($.identifier, $.array_index),

    basic_type: () => choice("INTEGER", "REAL", "CHAR", "STRING", "BOOLEAN"),
    array_size: ($) =>
      seq(
        $.int_literal,
        ":",
        $.int_literal,
        optional(seq(",", $.int_literal, ":", $.int_literal)),
      ),
    array_type: ($) =>
      seq(
        "ARRAY",
        "[",
        field("size", $.array_size),
        "]",
        "OF",
        field("type", $.basic_type),
      ),

    _literal: ($) =>
      choice(
        $.int_literal,
        $.real_literal,
        $.char_literal,
        $.string_literal,
        $.boolean_literal,
      ),
    int_literal: () => /-?[0-9]+/,
    real_literal: () => /-?[0-9]+\.[0-9]+/,
    char_literal: () => /'.'/,
    string_literal: () => /"[^"]*"/,
    boolean_literal: () => choice("TRUE", "FALSE"),

    // DECLARE <identifier> : <data type>
    variable_declaration: ($) =>
      seq("DECLARE", field("name", $.identifier), ":", field("type", $._type)),
    // CONSTANT <identifier> ← <value>
    constant_declaration: ($) =>
      seq(
        "CONSTANT",
        field("name", $.identifier),
        assignment_operator,
        field("value", $._literal),
      ),
    // <identifier> ← <value>
    assignment: ($) =>
      seq(
        field("left", $._identifier_ref),
        assignment_operator,
        field("right", $._expression),
      ),

    binary_op: ($) =>
      choice(
        _binop($, P.exponent, "^"),
        _binop($, P.muldiv, "*"),
        _binop($, P.muldiv, "/"),
        _binop($, P.addsub, "+"),
        _binop($, P.addsub, "-"),
        _binop($, P.comparator, "="),
        _binop($, P.comparator, "<"),
        _binop($, P.comparator, "<="),
        _binop($, P.comparator, ">"),
        _binop($, P.comparator, ">="),
        _binop($, P.comparator, "<>"),
        _binop($, P.andor, "AND"),
        _binop($, P.andor, "OR"),
      ),
    unary_op: ($) =>
      prec(P.unary, seq(choice("-", "NOT"), field("operand", $._expression))),

    comment: () => token(seq("//", /.*/)),

    input_statement: ($) => seq("INPUT", field("name", $._identifier_ref)),
    output_statement: ($) =>
      seq(
        "OUTPUT",
        field("value", $._expression),
        repeat(seq(",", field("value", $._expression))),
      ),

    return_statement: ($) => seq("RETURN", field("value", $._expression)),
    parameter: ($) =>
      seq(field("name", $.identifier), ":", field("type", $._type)),

    procedure_declaration: ($) =>
      seq(
        "PROCEDURE",
        field("name", $.identifier),
        optional(
          seq(
            "(",
            optional(
              seq(
                field("param", $.parameter),
                repeat(seq(",", field("param", $.parameter))),
              ),
            ),
            ")",
          ),
        ),
        optional(field("body", $.block)),
        "ENDPROCEDURE",
      ),
    function_declaration: ($) =>
      seq(
        "FUNCTION",
        field("name", $.identifier),
        optional(
          seq(
            "(",
            optional(
              seq(
                field("param", $.parameter),
                repeat(seq(",", field("param", $.parameter))),
              ),
            ),
            ")",
          ),
        ),
        "RETURNS",
        field("return_type", $._type),
        field("body", $.block),

        "ENDFUNCTION",
      ),

    procedure_call: ($) =>
      seq(
        "CALL",
        field("name", $.identifier),
        optional(
          seq(
            "(",
            field("arg", $._expression),
            repeat(seq(",", field("arg", $._expression))),
            ")",
          ),
        ),
      ),
    function_call: ($) =>
      seq(
        field("name", $.identifier),
        "(",
        optional(
          seq(
            field("arg", $._expression),
            repeat(seq(",", field("arg", $._expression))),
          ),
        ),
        ")",
      ),

    if_statement: ($) =>
      seq(
        "IF",
        field("cond", $._expression),
        "THEN",
        field("body", $.block),
        optional(seq("ELSE", field("else_body", $.block))),
        "ENDIF",
      ),
    case_statement: ($) =>
      seq(
        "CASE OF",
        field("value", $._identifier_ref),
        repeat1(
          seq(field("cond", $._literal), ":", field("body", $._statement)),
        ),
        optional(seq("OTHERWISE", field("otherwise", $._statement))),
        "ENDCASE",
      ),

    for_statement: ($) =>
      seq(
        "FOR",
        field("name", $._identifier_ref),
        assignment_operator,
        field("start", $._expression),
        "TO",
        field("end", $._expression),
        optional(seq("STEP", field("step", $._expression))),
        field("body", $.block),
        "NEXT",
        field("name", $._identifier_ref),
      ),
    repeat_statement: ($) =>
      seq(
        "REPEAT",
        field("body", $.block),
        "UNTIL",
        field("cond", $._expression),
      ),
    while_statement: ($) =>
      seq(
        "WHILE",
        field("cond", $._expression),
        "DO",
        field("body", $.block),
        "ENDWHILE",
      ),

    filename: () => /[^\s,]+/,
    open_file: ($) =>
      seq(
        "OPENFILE",
        field("file", $.filename),
        choice("FOR READ", "FOR WRITE"),
      ),
    close_file: ($) => seq("CLOSEFILE", field("file", $.filename)),
    read_file: ($) =>
      seq(
        "READFILE",
        field("file", $.filename),
        ",",
        field("name", $._identifier_ref),
      ),
    write_file: ($) =>
      seq(
        "WRITEFILE",
        field("file", $.filename),
        ",",
        field("name", $._identifier_ref),
      ),
  },
});
