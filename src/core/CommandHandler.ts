import {
  COMMANDS_META_KEY,
  COMMAND_GROUP_OPTIONS_META_KEY,
} from "./Decorators";
import { Command } from "./types/Command";
import {
  CommandGroup,
  CommandGroupClass,
  CommandGroupOptions,
} from "./types/CommandGroup";

interface CommandTreeNode {
  [name: string]: CommandTreeNode | Command;
}

export class CommandHandler {
  private commandTree: CommandTreeNode;
  private groupTree: CommandGroup[];

  constructor(commandGroupClasses: CommandGroupClass[]) {
    this.groupTree = this.buildGroupTreeRecursive(commandGroupClasses);
    this.commandTree = this.buildCommandTreeRecursive(this.groupTree);
  }

  private getCommandGroupOptions(
    commandGroup: CommandGroupClass
  ): CommandGroupOptions {
    const groupOptions = Reflect.getMetadata(
      COMMAND_GROUP_OPTIONS_META_KEY,
      commandGroup
    );

    if (groupOptions) {
      return groupOptions;
    } else {
      throw `${commandGroup.name} isn't a valid CommandGroup. Make sure to decorate it with the CommandGroup decorator!`;
    }
  }

  private getCommandGroupCommands(commandGroup: CommandGroupClass): Command[] {
    const groupCommands = Reflect.getMetadata(COMMANDS_META_KEY, commandGroup);

    if (groupCommands) {
      return groupCommands;
    } else {
      throw `${commandGroup.name} isn't a valid CommandGroup. Make sure to decorate it with the CommandGroup decorator!`;
    }
  }

  private buildGroupTreeRecursive(
    commandGroupClasses: CommandGroupClass[]
  ): CommandGroup[] {
    return commandGroupClasses.map((groupClass) => {
      const options = this.getCommandGroupOptions(groupClass);
      const commands = this.getCommandGroupCommands(groupClass);

      return {
        options,
        commands,
        subgroups: this.buildGroupTreeRecursive(options.subgroups || []),
      };
    });
  }

  private buildCommandTreeRecursive(
    commandGroups: CommandGroup[]
  ): CommandTreeNode {
    let subtree: CommandTreeNode = {};

    for (const commandGroup of commandGroups) {
      let groupNode: CommandTreeNode = {};

      // Add each command of group
      for (const command of commandGroup.commands) {
        if (command.options.aliases) {
          for (const commandAlias of command.options.aliases) {
            groupNode[commandAlias] = command;
          }
        } else {
          groupNode[command.originalName] = command;
        }
      }

      // Recursively add subtrees of subgroups
      if (commandGroup.subgroups.length > 0) {
        groupNode = {
          ...groupNode,
          ...this.buildCommandTreeRecursive(commandGroup.subgroups),
        };
      }

      // Wrap in prefix if given
      if (commandGroup.options.prefix) {
        groupNode = { [commandGroup.options.prefix]: groupNode };
      }

      // Add node to subtree
      subtree = {
        ...groupNode,
      };
    }

    return subtree;
  }

  findCommandInTree(treeNode: CommandTreeNode, commandArgs: string[]): Command {
    const nextNode = treeNode[commandArgs[0]];

    if (nextNode) {
      if (nextNode.invoke) {
        return nextNode as Command;
      } else {
        commandArgs.shift();
        return this.findCommandInTree(nextNode as CommandTreeNode, commandArgs);
      }
    }
  }

  /*
          
              const groupTree = [
              { name: "Group1", options: {}, commands: [], subgroups: [] },
              { name: "Group2", options: {}, commands: [], subgroups: [] },
            ];

            const commandTree = {
                groupPrefix1: {
                    command1: {},
                    alias1: {}
                },
                command2: {},
                command3: {},
            }

            interface CommandTreeNode {
                [name: string]: CommandTreeNode | CommandNode
            }
  
  */
}
