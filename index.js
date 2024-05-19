#!/usr/bin/env node

import axios from 'axios';
import { Command } from 'commander';
import chalk from 'chalk';
import Table from 'cli-table3';
import ora from 'ora';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const NUM_TODOS = process.env.NUM_TODOS || 20;
const NUM_RETRIES = process.env.NUM_RETRIES || 3;

const program = new Command();

program
  .version('1.0.0')
  .description('Fetch TODOs from jsonplaceholder')
  .option('-n, --num <number>', 'Number of TODOs to fetch', NUM_TODOS)
  .option('-r, --retries <number>', 'Number of retries for failed requests', NUM_RETRIES)
  .parse(process.argv);

const options = program.opts();
const totalTodos = +options.num || NUM_TODOS; // parse to int
const totalRetries = +options.retries || NUM_RETRIES;

const fetchTodo = async (id, retries) => {
  try {
    const response = await axios.get(`https://jsonplaceholder.typicode.com/todos/${id}`);
    return response.data;
  } catch (error) {
    if (retries > 0) {
      console.log(chalk.yellow(`Retrying TODO ${id} (${totalRetries - retries + 1})...`));
      return fetchTodo(id, retries - 1);
    } else {
      console.log(chalk.red(`Failed to fetch TODO ${id} after ${totalRetries} retries.`));
      return null;
    }
  }
};

const fetchTodos = async (numTodos, retries) => {
  const todoPromises = [];
  for (let i = 2; i <= numTodos * 2; i += 2) {
    todoPromises.push(fetchTodo(i, retries));
  }

  return todoPromises;
};

const main = async () => {
  console.log(chalk.blue(`Fetching ${totalTodos} TODOs with up to ${totalRetries} retries each...`));

  const table = new Table({
    head: [chalk.cyan('Index/ID'), chalk.cyan('Completion Status'), chalk.cyan('Title')],
    colWidths: [10, 20, 50],
  });

  const spinner = ora('Fetching TODOs...').start();
  const todoPromises = await fetchTodos(totalTodos, totalRetries);

  let fetchedTodos = 0;
  const processTodo = async (promise) => {
    const todo = await promise;
    if (todo) {
      table.push([todo.id, todo.completed ? chalk.green('Completed') : chalk.red('Not Completed'), todo.title]);
      console.log(table.toString());
      table.splice(-1, 1); // Remove the last row to prevent duplicate output
      fetchedTodos++;
    }
    if (fetchedTodos === totalTodos) {
      spinner.stop();
      console.log(chalk.green('All TODOs fetched.'));
    }
  };

  todoPromises.forEach(promise => processTodo(promise));

  spinner.start(); // Restart spinner if it stops prematurely
};

main();
